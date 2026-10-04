from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from app.database import models
from app.database.database import get_db
from app.api.auth_deps import get_current_user

router = APIRouter()

# Pydantic schemas for the API
class QuoteCreate(BaseModel):
    text: str = Field(..., description="The quote text")
    author: Optional[str] = None
    source: Optional[str] = None
    tags: Optional[str] = None

class QuoteResponse(QuoteCreate):
    id: int

    class Config:
        from_attributes = True

@router.get("/", response_model=List[QuoteResponse])
def get_quotes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    quotes = db.query(models.Quote).filter(models.Quote.user_id == current_user.id).offset(skip).limit(limit).all()
    return quotes

@router.post("/", response_model=QuoteResponse)
def create_quote(quote: QuoteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_quote = models.Quote(**quote.model_dump(), user_id=current_user.id)
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    return db_quote

@router.delete("/all")
def delete_all_quotes(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_quotes = db.query(models.Quote).filter(models.Quote.user_id == current_user.id).all()
    count = len(db_quotes)
    for db_quote in db_quotes:
        db.delete(db_quote)
    db.commit()
    return {"status": "success", "deleted_count": count}

@router.delete("/{quote_id}")
def delete_quote(quote_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_quote = db.query(models.Quote).filter(models.Quote.id == quote_id, models.Quote.user_id == current_user.id).first()
    if db_quote is None:
        raise HTTPException(status_code=404, detail="Quote not found")
    db.delete(db_quote)
    db.commit()
    return {"status": "success"}
