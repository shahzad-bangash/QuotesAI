from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os
import time
from pathlib import Path
from app.rag.engine import ingest_document, extract_quotes, clear_user_documents, get_vectorstore
from sqlalchemy.orm import Session
from fastapi import Depends
from app.database.database import get_db
from app.database.models import User, GeneratedImage
from app.api.auth_deps import get_current_user

router = APIRouter()

DATA_DIR = os.getenv("DATA_DIR", str(Path(__file__).parent.parent.parent.parent))
UPLOAD_DIR = Path(DATA_DIR) / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

GENERATED_DIR = Path(DATA_DIR) / "generated"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

class ExtractRequest(BaseModel):
    prompt: str
    limit: Optional[int] = 3

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not (file.filename.lower().endswith('.pdf') or file.filename.lower().endswith('.txt')):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported.")
        
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    MAX_SIZE = 50 * 1024 * 1024
    if file_size > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the maximum limit of 50MB.")
        
    if not current_user.is_admin:
        if current_user.has_uploaded_document:
            raise HTTPException(status_code=403, detail="You have reached your lifetime limit of 1 document upload.")
        vectorstore = get_vectorstore()
        results = vectorstore.get(where={"user_id": current_user.id})
        if results and results["ids"]:
            raise HTTPException(status_code=403, detail="You can only index 1 file. Please delete your current index first.")

    file_path = UPLOAD_DIR / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        chunks_indexed = ingest_document(str(file_path), source_name=file.filename, user_id=current_user.id)
        if not current_user.is_admin:
            current_user.has_uploaded_document = True
            db.commit()
        return {"status": "success", "filename": file.filename, "chunks_indexed": chunks_indexed}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract")
async def extract_from_documents(request: ExtractRequest, current_user: User = Depends(get_current_user)):
    try:
        quotes = extract_quotes(request.prompt, user_id=current_user.id, limit=request.limit)
        return {"status": "success", "quotes": quotes}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/images")
def list_images(type: str = "jpeg", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if type not in ["jpeg", "png"]:
        raise HTTPException(status_code=400, detail="Invalid type")
    
    db_images = db.query(GeneratedImage).filter(
        GeneratedImage.user_id == current_user.id,
        GeneratedImage.type == type
    ).order_by(GeneratedImage.created_at.desc()).all()
    
    images = []
    for db_img in db_images:
        file_path = GENERATED_DIR / type / db_img.filename
        size_kb = 0
        if file_path.exists():
            stat = file_path.stat()
            size_kb = stat.st_size / 1024
            
        images.append({
            "id": db_img.id,
            "name": db_img.filename,
            "url": f"/images/{type}/{db_img.filename}",
            "type": type,
            "size": f"{size_kb:.1f} KB",
            "created_at": db_img.created_at.strftime('%Y-%m-%dT%H:%M:%SZ') if db_img.created_at else ""
        })
    return images

@router.delete("/images/{type}/{filename}")
def delete_image(type: str, filename: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if type not in ["jpeg", "png"]:
        raise HTTPException(status_code=400, detail="Invalid type")
    
    db_img = db.query(GeneratedImage).filter(
        GeneratedImage.user_id == current_user.id,
        GeneratedImage.type == type,
        GeneratedImage.filename == filename
    ).first()
    
    if not db_img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    db.delete(db_img)
    db.commit()
    
    file_path = GENERATED_DIR / type / filename
    if file_path.exists():
        os.remove(file_path)
    return {"status": "success"}

@router.delete("/rag")
def clean_rag_documents(current_user: User = Depends(get_current_user)):
    try:
        count = clear_user_documents(current_user.id)
        return {"status": "success", "deleted_chunks": count}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/images/all")
def delete_all_images(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        db_images = db.query(GeneratedImage).filter(
            GeneratedImage.user_id == current_user.id
        ).all()
        
        for db_img in db_images:
            file_path = GENERATED_DIR / db_img.type / db_img.filename
            if file_path.exists():
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Failed to delete file {file_path}: {e}")
                    
            db.delete(db_img)
            
        db.commit()
        return {"status": "success", "deleted_count": len(db_images)}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
