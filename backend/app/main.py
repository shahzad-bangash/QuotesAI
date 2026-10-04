import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import generation, quotes, documents, schedules, auth, book_quotes
from app.database.database import engine, Base, SessionLocal
from app.database.models import User, GeneratedImage
from pathlib import Path
from contextlib import asynccontextmanager
from app.scheduler import start_scheduler
from app.api.auth_deps import get_current_user
from fastapi import Depends

# Create database tables
Base.metadata.create_all(bind=engine)

def cleanup_missing_files():
    db = SessionLocal()
    try:
        DATA_DIR = os.getenv("DATA_DIR", str(Path(__file__).parent.parent))
        GENERATED_DIR = Path(DATA_DIR) / "generated"

        # 1. Clean up missing profile pictures
        users = db.query(User).filter(User.profile_pic_url.isnot(None)).all()
        for user in users:
            parts = user.profile_pic_url.split("/images/")
            if len(parts) > 1:
                file_path = GENERATED_DIR / parts[1]
                if not file_path.exists():
                    user.profile_pic_url = None
        
        # 2. Clean up missing generated images
        images = db.query(GeneratedImage).all()
        for image in images:
            file_path = GENERATED_DIR / image.type / image.filename
            if not file_path.exists():
                db.delete(image)
        
        db.commit()
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    cleanup_missing_files()
    start_scheduler()
    yield
    # Shutdown
    # (Optional: stop scheduler)

app = FastAPI(title="QuotesAI API", lifespan=lifespan)

# Serve generated files statically
DATA_DIR = os.getenv("DATA_DIR", str(Path(__file__).parent.parent))
GENERATED_DIR = Path(DATA_DIR) / "generated"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/images", StaticFiles(directory=str(GENERATED_DIR)), name="images")

# Configure CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth router is unprotected
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

# All other API routes are protected
protected_dep = [Depends(get_current_user)]
app.include_router(generation.router, prefix="/api", tags=["generation"], dependencies=protected_dep)
app.include_router(quotes.router, prefix="/api/quotes", tags=["quotes"], dependencies=protected_dep)
app.include_router(documents.router, prefix="/api/documents", tags=["documents"], dependencies=protected_dep)
app.include_router(schedules.router, prefix="/api/schedules", tags=["schedules"], dependencies=protected_dep)
app.include_router(book_quotes.router, prefix="/api/book-quotes", tags=["book-quotes"], dependencies=protected_dep)
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "QuotesAI API is running"}
