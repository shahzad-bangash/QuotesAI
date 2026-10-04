from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from app.database.database import get_db
from app.database.models import Schedule, User
from app.api.auth_deps import get_current_user
from app.scheduler import refresh_schedules

router = APIRouter()

class ScheduleCreate(BaseModel):
    cron_expression: str = Field(..., description="A standard cron expression (e.g. '0 9 * * *')")
    topic_filter: Optional[str] = Field(None, description="Optional topic to search in the RAG library")

class ScheduleResponse(BaseModel):
    id: int
    cron_expression: str
    topic_filter: Optional[str]
    is_active: bool

@router.get("/", response_model=List[ScheduleResponse])
def list_schedules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Schedule).filter(Schedule.user_id == current_user.id).all()

@router.post("/", response_model=ScheduleResponse)
def create_schedule(req: ScheduleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_schedule = Schedule(
        user_id=current_user.id,
        cron_expression=req.cron_expression,
        topic_filter=req.topic_filter,
        is_active=True
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    
    # Reload APScheduler jobs
    refresh_schedules()
    
    return db_schedule

@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id, Schedule.user_id == current_user.id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    db.delete(schedule)
    db.commit()
    
    # Reload APScheduler jobs
    refresh_schedules()
    
    return {"status": "success"}
