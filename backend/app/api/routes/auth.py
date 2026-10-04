from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import re
import uuid
import shutil
import os
import random
import string
from pathlib import Path
from pydantic import BaseModel, field_validator, EmailStr
from typing import Optional
import smtplib
from email.message import EmailMessage

from app.database.database import get_db
from app.database.models import User
from app.api.auth_deps import (
    verify_password,
    get_password_hash,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_user
)

router = APIRouter()


class UserCreate(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str

    @field_validator('password')
    @classmethod
    def password_must_be_strong(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(not char.isalnum() for char in v):
            raise ValueError('Password must contain at least one special symbol')
        return v

class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    current_password: Optional[str] = None

    @field_validator('password')
    @classmethod
    def password_must_be_strong(cls, v):
        if v is None:
            return v
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(not char.isalnum() for char in v):
            raise ValueError('Password must contain at least one special symbol')
        return v

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def password_must_be_strong(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[^A-Za-z0-9]', v):
            raise ValueError('Password must contain at least one special character')
        return v

class VerifyEmailRequest(BaseModel):
    otp: str

class DeleteAccountRequest(BaseModel):
    confirmation: str

class Token(BaseModel):
    access_token: str
    token_type: str


@router.post("/register")
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing_email = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_email:
        if existing_email.is_verified:
            raise HTTPException(
                status_code=400,
                detail="The email address is already in use.",
            )
        else:
            db.delete(existing_email)
            db.commit()

    existing_username = db.query(User).filter(User.username == user_in.username).first()
    if existing_username:
        if existing_username.is_verified:
            raise HTTPException(
                status_code=400,
                detail="The username is already taken.",
            )
        else:
            db.delete(existing_username)
            db.commit()
        
    if user_in.email.lower().endswith('@quotesai.com') and user_in.email.lower() != 'admin@quotesai.com':
        otp = "123456"
    else:
        otp = "".join(random.choices(string.digits, k=6))
    
    user = User(
        name=user_in.name,
        username=user_in.username,
        email=user_in.email.lower(),
        hashed_password=get_password_hash(user_in.password),
        is_verified=False,
        otp_code=otp,
        otp_expires_at=datetime.utcnow() + timedelta(minutes=2)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    gmail_address = os.getenv("GMAIL_ADDRESS", "no.reply.quotes.ai@gmail.com")
    gmail_app_password = os.getenv("GMAIL_APP_PASSWORD", "")
    
    if user.email.endswith('@quotesai.com') and user.email != 'admin@quotesai.com':
        print(f"Bypassing email for test user: {user.email}, OTP: {otp}")
    elif gmail_app_password:
        try:
            msg = EmailMessage()
            msg['Subject'] = 'Welcome to QuotesAI - Verify Your Email'
            msg['From'] = f"QuotesAI <{gmail_address}>"
            msg['To'] = user.email
            msg.set_content(f"Welcome to QuotesAI!\n\nYour verification OTP code is: {otp}\n\nThis code will expire in 2 minutes.")
            
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
                smtp.login(gmail_address, gmail_app_password)
                smtp.send_message(msg)
        except Exception as e:
            print(f"Failed to send email: {e}")
    else:
        print(f"Would have sent OTP {otp} to {user.email}")
        
    return {"message": "Registration successful. Please verify your email.", "requires_verification": True}


@router.post("/token", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    # form_data.username can be either username or email
    login_str = form_data.username.lower()
    if "@" in login_str:
        user = db.query(User).filter(User.email == login_str).first()
    else:
        user = db.query(User).filter(User.username == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please verify your email address before logging in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/verify-signup", response_model=Token)
def verify_signup(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    from datetime import datetime
    
    email = req.email.lower()
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User is already verified.")
        
    if not user.otp_code or user.otp_code != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
        
    if not user.otp_expires_at or user.otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP code has expired.")
        
    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/resend-signup-otp")
def resend_signup_otp(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    
    email = req.email.lower()
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User is already verified.")
        
    if user.email.endswith('@quotesai.com') and user.email != 'admin@quotesai.com':
        otp = "123456"
    else:
        otp = "".join(random.choices(string.digits, k=6))
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=2)
    db.commit()
    
    gmail_address = os.getenv("GMAIL_ADDRESS", "no.reply.quotes.ai@gmail.com")
    gmail_app_password = os.getenv("GMAIL_APP_PASSWORD", "")
    
    if user.email.endswith('@quotesai.com') and user.email != 'admin@quotesai.com':
        print(f"Bypassing email for test user: {user.email}, OTP: {otp}")
    elif gmail_app_password:
        try:
            msg = EmailMessage()
            msg['Subject'] = 'Welcome to QuotesAI - Verify Your Email'
            msg['From'] = f"QuotesAI <{gmail_address}>"
            msg['To'] = user.email
            msg.set_content(f"Welcome to QuotesAI!\n\nYour new verification OTP code is: {otp}\n\nThis code will expire in 2 minutes.")
            
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
                smtp.login(gmail_address, gmail_app_password)
                smtp.send_message(msg)
        except Exception as e:
            raise HTTPException(status_code=500, detail="Failed to resend verification email.")
    else:
        print(f"Would have sent OTP {otp} to {user.email}")
        
    return {"message": "OTP has been resent to your email address."}


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = req.email.lower()
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="This email address is not registered in our system.")
        
    # Generate a 6-digit numeric OTP
    if user.email.endswith('@quotesai.com') and user.email != 'admin@quotesai.com':
        otp_code = "123456"
    else:
        otp_code = "".join(random.choices(string.digits, k=6))
    
    user.otp_code = otp_code
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=2)
    db.commit()
    
    gmail_address = os.getenv("GMAIL_ADDRESS", "no.reply.quotes.ai@gmail.com")
    gmail_app_password = os.getenv("GMAIL_APP_PASSWORD", "")
    
    if user.email.endswith('@quotesai.com') and user.email != 'admin@quotesai.com':
        print(f"Bypassing email for test user: {user.email}, OTP: {otp_code}")
    else:
        if not gmail_app_password:
            print(f"Would have sent OTP {otp_code} to {user.email}")
            raise HTTPException(status_code=500, detail="GMAIL_APP_PASSWORD is not configured on this server. Check server logs.")

        try:
            msg = EmailMessage()
            msg['Subject'] = 'Your Password Reset OTP for QuotesAI'
            msg['From'] = f"QuotesAI <{gmail_address}>"
            msg['To'] = user.email
            msg.set_content(f"You requested a password reset.\n\nYour OTP code is: {otp_code}\n\nThis code will expire in 2 minutes.")
            
            msg.add_alternative(f"""\
            <html>
              <body>
                <p>You requested a password reset.</p>
                <p>Your OTP code is: <strong>{otp_code}</strong></p>
                <p>This code will expire in 2 minutes.</p>
              </body>
            </html>
            """, subtype='html')

            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
                smtp.login(gmail_address, gmail_app_password)
                smtp.send_message(msg)
                
        except Exception as e:
            print(f"Error sending email: {e}")
            raise HTTPException(status_code=500, detail="Failed to send email. Ensure your Gmail App Password is valid.")
        
    return {"message": "An OTP code has been sent to your email."}

@router.post("/verify-otp")
def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    from datetime import datetime
    
    email = req.email.lower()
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="This email address is not registered in our system.")
        
    if not user.otp_code or user.otp_code != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
        
    if not user.otp_expires_at or user.otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP code has expired.")
        
    return {"message": "OTP verified successfully."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    from datetime import datetime
    
    email = req.email.lower()
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="This email address is not registered in our system.")
        
    if user.email == 'admin@quotesai.com':
        raise HTTPException(status_code=403, detail="The password for the admin account cannot be changed.")

    if not user.otp_code or user.otp_code != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
        
    if not user.otp_expires_at or user.otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP code has expired.")
        
    # Update password and clear OTP
    user.hashed_password = get_password_hash(req.new_password)
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()
    
    return {"message": "Your password has been successfully reset."}


@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id, 
        "username": current_user.username, 
        "email": current_user.email,
        "name": current_user.name,
        "profile_pic_url": current_user.profile_pic_url,
        "is_admin": current_user.is_admin
    }


@router.get("/profile")
def read_users_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id, 
        "username": current_user.username, 
        "email": current_user.email,
        "name": current_user.name,
        "profile_pic_url": current_user.profile_pic_url,
        "is_admin": current_user.is_admin
    }


@router.put("/profile")
def update_user_profile(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.email == 'admin@quotesai.com':
        raise HTTPException(
            status_code=403,
            detail="Admin account details cannot be changed."
        )
        
    if user_update.email or user_update.password:
        if not user_update.current_password or not verify_password(user_update.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect current password",
            )
    
    if user_update.username and user_update.username != current_user.username:
        existing_user = db.query(User).filter(User.username == user_update.username).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="The username is already taken.",
            )
        current_user.username = user_update.username
        
    requires_otp = False
    if user_update.email and user_update.email.lower() != current_user.email:
        existing_email = db.query(User).filter(User.email == user_update.email.lower()).first()
        if existing_email:
            raise HTTPException(
                status_code=400,
                detail="The email address is already in use.",
            )
        
        # Generate OTP for new email verification
        import random
        import string
        from email.message import EmailMessage
        import smtplib
        import os
        
        if user_update.email.lower().endswith('@quotesai.com') and user_update.email.lower() != 'admin@quotesai.com':
            otp = "123456"
        else:
            otp = "".join(random.choices(string.digits, k=6))
        current_user.otp_code = otp
        current_user.otp_expires_at = datetime.utcnow() + timedelta(minutes=2)
        current_user.pending_email = user_update.email.lower()
        
        gmail_address = os.getenv("GMAIL_ADDRESS", "no.reply.quotes.ai@gmail.com")
        gmail_app_password = os.getenv("GMAIL_APP_PASSWORD", "")
        
        if current_user.pending_email.endswith('@quotesai.com') and current_user.pending_email != 'admin@quotesai.com':
            print(f"Bypassing email for test user: {current_user.pending_email}, OTP: {otp}")
            requires_otp = True
        elif gmail_app_password:
            try:
                msg = EmailMessage()
                msg['Subject'] = 'Verify your new email for QuotesAI'
                msg['From'] = f"QuotesAI <{gmail_address}>"
                msg['To'] = user_update.email.lower()
                msg.set_content(f"You requested to change your email address.\n\nYour OTP code is: {otp}\n\nThis code will expire in 2 minutes.")
                
                with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
                    smtp.login(gmail_address, gmail_app_password)
                    smtp.send_message(msg)
                requires_otp = True
            except Exception as e:
                raise HTTPException(status_code=500, detail="Failed to send verification email.")
        else:
            # For local dev without app password configured
            print(f"Would have sent OTP {otp} to {user_update.email.lower()}")
            raise HTTPException(status_code=500, detail="GMAIL_APP_PASSWORD is not configured on this server. Check server logs.")
        
    if user_update.name is not None:
        current_user.name = user_update.name
        
    if user_update.password:
        current_user.hashed_password = get_password_hash(user_update.password)
        
    db.commit()
    db.refresh(current_user)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user.username}, expires_delta=access_token_expires
    )
    
    return {
        "message": "OTP sent to your new email. Please verify." if requires_otp else "Profile updated successfully", 
        "requires_otp": requires_otp,
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "name": current_user.name,
            "profile_pic_url": current_user.profile_pic_url,
            "is_admin": current_user.is_admin
        }
    }


@router.post("/profile/picture")
def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    DATA_DIR = os.getenv("DATA_DIR", str(Path(__file__).parent.parent.parent.parent))
    profiles_dir = Path(DATA_DIR) / "generated" / "profiles"
    profiles_dir.mkdir(parents=True, exist_ok=True)
    
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{current_user.username}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = profiles_dir / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    pic_url = f"/images/profiles/{filename}"
    current_user.profile_pic_url = pic_url
    db.commit()
    
    return {"message": "Profile picture updated", "profile_pic_url": pic_url}


@router.delete("/profile/picture")
def delete_profile_picture(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.profile_pic_url:
        # Extract filename from url
        filename = current_user.profile_pic_url.split('/')[-1]
        DATA_DIR = os.getenv("DATA_DIR", str(Path(__file__).parent.parent.parent.parent))
        file_path = Path(DATA_DIR) / "generated" / "profiles" / filename
        
        if file_path.exists():
            os.remove(file_path)
            
        current_user.profile_pic_url = None
        db.commit()
        
    return {"message": "Profile picture deleted successfully"}

@router.post("/profile/verify-email")
def verify_email_update(
    req: VerifyEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime
    
    if not current_user.pending_email:
        raise HTTPException(status_code=400, detail="No pending email update found.")
        
    if not current_user.otp_code or current_user.otp_code != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
        
    if not current_user.otp_expires_at or current_user.otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP code has expired.")
        
    # Update email and clear OTP
    current_user.email = current_user.pending_email
    current_user.pending_email = None
    current_user.otp_code = None
    current_user.otp_expires_at = None
    
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Email verified and updated successfully.",
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "name": current_user.name,
            "profile_pic_url": current_user.profile_pic_url,
            "is_admin": current_user.is_admin
        }
    }

@router.post("/profile/resend-otp")
def resend_profile_otp(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import random
    import string
    from email.message import EmailMessage
    import smtplib
    import os
    
    if not current_user.pending_email:
        raise HTTPException(status_code=400, detail="No pending email update found.")
        
    if current_user.pending_email.endswith('@quotesai.com') and current_user.pending_email != 'admin@quotesai.com':
        otp = "123456"
    else:
        otp = "".join(random.choices(string.digits, k=6))
    current_user.otp_code = otp
    current_user.otp_expires_at = datetime.utcnow() + timedelta(minutes=2)
    db.commit()
    
    gmail_address = os.getenv("GMAIL_ADDRESS", "no.reply.quotes.ai@gmail.com")
    gmail_app_password = os.getenv("GMAIL_APP_PASSWORD", "")
    
    if current_user.pending_email.endswith('@quotesai.com') and current_user.pending_email != 'admin@quotesai.com':
        print(f"Bypassing email for test user: {current_user.pending_email}, OTP: {otp}")
    elif gmail_app_password:
        try:
            msg = EmailMessage()
            msg['Subject'] = 'Your New OTP for QuotesAI'
            msg['From'] = f"QuotesAI <{gmail_address}>"
            msg['To'] = current_user.pending_email
            msg.set_content(f"You requested to change your email address.\n\nYour new OTP code is: {otp}\n\nThis code will expire in 2 minutes.")
            
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
                smtp.login(gmail_address, gmail_app_password)
                smtp.send_message(msg)
        except Exception as e:
            raise HTTPException(status_code=500, detail="Failed to resend verification email.")
    else:
        print(f"Would have sent OTP {otp} to {current_user.pending_email}")
        raise HTTPException(status_code=500, detail="GMAIL_APP_PASSWORD is not configured on this server.")
        
    return {"message": "OTP has been resent to your new email address."}

@router.delete("/profile")
def delete_account(
    req: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import os
    from pathlib import Path
    
    if current_user.email == 'admin@quotesai.com':
        raise HTTPException(status_code=403, detail="The admin account cannot be deleted.")
        
    if req.confirmation != current_user.username:
        raise HTTPException(status_code=400, detail="Confirmation username does not match.")
        
    # Delete profile picture if exists
    if current_user.profile_pic_url:
        filename = current_user.profile_pic_url.split('/')[-1]
        DATA_DIR = os.getenv("DATA_DIR", str(Path(__file__).parent.parent.parent.parent))
        file_path = Path(DATA_DIR) / "generated" / "profiles" / filename
        if file_path.exists():
            os.remove(file_path)
            
    # Delete related records
    from app.database.models import Quote, Schedule, GeneratedImage
    
    db.query(Quote).filter(Quote.user_id == current_user.id).delete()
    db.query(Schedule).filter(Schedule.user_id == current_user.id).delete()
    db.query(GeneratedImage).filter(GeneratedImage.user_id == current_user.id).delete()
    
    # Delete user
    db.delete(current_user)
    db.commit()
    
    return {"message": "Account successfully deleted."}
