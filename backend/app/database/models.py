from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database.database import Base

class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    text = Column(String, nullable=False)
    author = Column(String, index=True)
    source = Column(String, index=True)
    tags = Column(String)  # comma separated tags

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    cron_expression = Column(String, nullable=False)
    topic_filter = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    profile_pic_url = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)
    has_uploaded_document = Column(Boolean, default=False)
    images_generated_count = Column(Integer, default=0)
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    pending_email = Column(String, nullable=True)
    book_quotes_search_count = Column(Integer, default=0)

class GeneratedImage(Base):
    __tablename__ = "generated_images"

    id = Column(String, primary_key=True, index=True) # UUID string
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    type = Column(String, nullable=False) # 'jpeg' or 'png'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
