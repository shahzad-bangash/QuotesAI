from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.database.models import Schedule, User, GeneratedImage
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def automated_generation_job(schedule_id: int):
    # This job will be triggered by cron
    logger.info(f"Running automated generation for schedule {schedule_id}")
    
    db: Session = SessionLocal()
    try:
        schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
        if not schedule or not schedule.is_active:
            logger.info("Schedule inactive or deleted. Skipping.")
            return
            
        topic = schedule.topic_filter
        user_id = schedule.user_id
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"User {user_id} not found for schedule {schedule_id}. Skipping.")
            return
            
        user_profile = {
            "name": user.name or "Name",
            "username": f"@{user.username}" if user.username else "@username",
            "profile_pic_url": user.profile_pic_url
        }
        
        # 1. Fetch a quote using RAG
        # We need to hit our RAG engine or generate directly from RAG
        from app.rag.engine import get_vectorstore
        from app.graph.generation_graph import generation_app
        from app.rendering.renderer import render_quote_image
        import random
        
        vectorstore = get_vectorstore()
        query = topic if topic else "an inspiring quote"
        docs = vectorstore.similarity_search(query, k=5)
        
        if not docs:
            logger.warning("No documents found in RAG for scheduling. Falling back to random quotes.")
            import json
            import os
            
            quotes_path = os.path.join(os.path.dirname(__file__), "data", "quotes.json")
            try:
                with open(quotes_path, "r") as f:
                    quotes_data = json.load(f)
                selected = random.choice(quotes_data)
                raw_text = selected.get("quote", "")
                source = selected.get("source", "Unknown")
                author = selected.get("author", "Unknown")
            except Exception as e:
                logger.error(f"Failed to load random quotes fallback: {e}")
                return
            
            # Bypass LLM to save API usage
            logger.info("Bypassing LLM generation for fallback quote...")
            final_state = {
                "quote": raw_text,
                "author": author,
            }
            suggested_style = random.choice(["mental_notes", "dark", "light"])
            
        else:
            selected_doc = random.choice(docs)
            raw_text = selected_doc.page_content
            source = selected_doc.metadata.get("source_name", "Unknown")
            author = "Unknown"
            
            # 2. Run generation agent
            logger.info("Generating graphic and metadata via LLM...")
            final_state = generation_app.invoke({
                "quote": raw_text,
                "author": author,
                "source": source
            })
            suggested_style = final_state.get("suggested_style", "mental_notes")
        
        # 3. Render graphic
        result = render_quote_image(
            quote_text=final_state["quote"],
            author=final_state["author"],
            source=source,
            style_name=suggested_style,
            user_profile=user_profile
        )
        
        # 4. Save to database so it appears in Library
        db_image = GeneratedImage(
            id=result["generation_id"], 
            user_id=user_id, 
            filename=result["filename"], 
            type=result['format']
        )
        db.add(db_image)
        db.commit()
        
        logger.info(f"Successfully generated and saved graphic to {result['image_path']}")
        # In the future, this is where we'd push to Instagram API
        # with final_state["caption"] and final_state["hashtags"]
        
    except Exception as e:
        logger.error(f"Error in automated_generation_job: {str(e)}")
    finally:
        db.close()

def refresh_schedules():
    """Reloads all active schedules from the database into APScheduler."""
    scheduler.remove_all_jobs()
    
    db: Session = SessionLocal()
    try:
        schedules = db.query(Schedule).filter(Schedule.is_active == True).all()
        for s in schedules:
            try:
                # APScheduler cron strings are usually standard (e.g. "0 9 * * *")
                # We can use from_crontab to parse them
                trigger = CronTrigger.from_crontab(s.cron_expression)
                scheduler.add_job(
                    automated_generation_job,
                    trigger=trigger,
                    args=[s.id],
                    id=f"schedule_{s.id}",
                    replace_existing=True
                )
                logger.info(f"Loaded schedule {s.id} with cron {s.cron_expression}")
            except Exception as e:
                logger.error(f"Failed to load schedule {s.id}: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler.start()
    refresh_schedules()
