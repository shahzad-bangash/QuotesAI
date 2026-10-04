import os
import sys
from sqlalchemy import create_engine, inspect, text
from dotenv import load_dotenv

load_dotenv()

DATA_DIR = os.getenv("DATA_DIR", ".")
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = f"sqlite:///{DATA_DIR}/quotes.db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+pg8000://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

def column_exists(table_name, column_name):
    inspector = inspect(engine)
    if not inspector.has_table(table_name):
        # If the table doesn't exist yet, we don't need to migrate it.
        # It will be created with all columns automatically by Base.metadata.create_all()
        return True
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns

def migrate():
    with engine.connect() as conn:
        print("Checking database schema for required columns...")
        
        # Check email
        if not column_exists("users", "email"):
            print("Adding 'email' column to 'users' table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR;"))
            try:
                conn.execute(text("CREATE UNIQUE INDEX ix_users_email ON users (email);"))
            except Exception as e:
                print(f"Index creation failed (might already exist or not supported): {e}")
        
        # Check otp_code
        if not column_exists("users", "otp_code"):
            print("Adding 'otp_code' column to 'users' table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN otp_code VARCHAR;"))
            
        # Check otp_expires_at
        if not column_exists("users", "otp_expires_at"):
            print("Adding 'otp_expires_at' column to 'users' table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN otp_expires_at DATETIME;"))
            
        # Check pending_email
        if not column_exists("users", "pending_email"):
            print("Adding 'pending_email' column to 'users' table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN pending_email VARCHAR;"))

        # Check book_quotes_search_count
        if not column_exists("users", "book_quotes_search_count"):
            print("Adding 'book_quotes_search_count' column to 'users' table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN book_quotes_search_count INTEGER DEFAULT 0;"))

        # Check is_verified
        if not column_exists("users", "is_verified"):
            print("Adding 'is_verified' column to 'users' table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0;"))
            
        conn.commit()
        print("Database schema migration completed successfully.")

if __name__ == "__main__":
    migrate()
