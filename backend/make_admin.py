import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Ensure we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.models import User

def make_admin(username: str):
    load_dotenv()
    
    # 1. Get the DATABASE_URL. If connecting to Render remotely, 
    # make sure this is set to your Render EXTERNAL Database URL.
    db_url = os.getenv("DATABASE_URL")
    
    if not db_url:
        print("DATABASE_URL not set, falling back to local SQLite.")
        DATA_DIR = os.getenv("DATA_DIR", ".")
        db_url = f"sqlite:///{DATA_DIR}/quotes.db"

    # Fix postgres:// to postgresql:// if necessary
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    if "postgresql" in db_url and "sslmode" not in db_url:
        db_url += "&sslmode=require" if "?" in db_url else "?sslmode=require"

    print(f"Connecting to database...")
    
    engine = create_engine(
        db_url, 
        connect_args={"check_same_thread": False} if "sqlite" in db_url else {}
    )
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        user = db.query(User).filter(User.username == username).first()
        
        if not user:
             print(f"User '{username}' not found.")
             return
            
        user.is_admin = True
        user.is_verified = True
        db.commit()
        print(f"Success! Existing user '{username}' is now a verified admin.")
        
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <username>")
        sys.exit(1)
    
    # Join the arguments in case the username contains spaces
    username = " ".join(sys.argv[1:])
    make_admin(username)
