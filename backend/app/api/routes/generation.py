from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.rendering.renderer import render_quote_image
from app.rendering.text_layout import LayoutOverflowError
from sqlalchemy.orm import Session
from fastapi import Depends
from app.database.database import get_db
from app.database.models import User, GeneratedImage
from app.api.auth_deps import get_current_user
import traceback
import base64

router = APIRouter()

class GenerationRequest(BaseModel):
    quote: str = Field(..., max_length=2000, description="The quote text to render")
    author: Optional[str] = Field("", max_length=100)
    source: Optional[str] = Field("", max_length=100)
    style: Optional[str] = "mental_notes"
    format: Optional[str] = Field("jpeg", description="Output format: jpeg or png")

@router.post("/generate/static")
def generate_static(request: GenerationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        if not current_user.is_admin:
            if current_user.images_generated_count >= 3:
                raise HTTPException(status_code=403, detail="You have reached the maximum limit of 3 generated images.")

        user_profile = {
            "name": current_user.name or "Name",
            "username": f"@{current_user.username}" if current_user.username else "@username",
            "profile_pic_url": current_user.profile_pic_url
        }
        
        result = render_quote_image(
            quote_text=request.quote,
            author=request.author,
            source=request.source,
            style_name=request.style,
            format=request.format,
            user_profile=user_profile
        )
        
        # Save to DB
        db_image = GeneratedImage(id=result["generation_id"], user_id=current_user.id, filename=result["filename"], type=result['format'])
        db.add(db_image)
        if not current_user.is_admin:
            current_user.images_generated_count += 1
        db.commit()
        
        # Read the generated image and encode to base64
        with open(result["image_path"], "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            
        mime_type = "image/png" if result["format"] == "png" else "image/jpeg"
        return {
            "status": "success",
            "generation_id": result["generation_id"],
            "url": f"/images/{result['format']}/{result['filename']}",
            "image_base64": f"data:{mime_type};base64,{encoded_string}"
        }
    except LayoutOverflowError as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

from app.graph.generation_graph import generation_app

@router.post("/generate/auto")
def generate_auto(request: GenerationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        if not current_user.is_admin:
            if current_user.images_generated_count >= 3:
                raise HTTPException(status_code=403, detail="You have reached the maximum limit of 3 generated images.")

        # 1. Run through LangGraph to get the suggested style
        final_state = generation_app.invoke({
            "quote": request.quote,
            "author": request.author,
            "source": request.source
        })
        
        suggested_style = final_state.get("suggested_style", "mental_notes")
        
        user_profile = {
            "name": current_user.name or "Name",
            "username": f"@{current_user.username}" if current_user.username else "@username",
            "profile_pic_url": current_user.profile_pic_url
        }
        
        # 2. Render deterministically with the AI-chosen style
        result = render_quote_image(
            quote_text=request.quote,
            author=request.author,
            source=request.source,
            style_name=suggested_style,
            format=request.format,
            user_profile=user_profile
        )
        
        # Save to DB
        db_image = GeneratedImage(id=result["generation_id"], user_id=current_user.id, filename=result["filename"], type=result['format'])
        db.add(db_image)
        if not current_user.is_admin:
            current_user.images_generated_count += 1
        db.commit()
        
        # Read image to base64
        with open(result["image_path"], "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            
        mime_type = "image/png" if result["format"] == "png" else "image/jpeg"
        return {
            "status": "success",
            "generation_id": result["generation_id"],
            "suggested_style": suggested_style,
            "topic": final_state.get("topic"),
            "tone": final_state.get("tone"),
            "caption": final_state.get("caption"),
            "hashtags": final_state.get("hashtags", []),
            "image_base64": f"data:{mime_type};base64,{encoded_string}",
            "url": f"/images/{result['format']}/{result['filename']}"
        }
    except LayoutOverflowError as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
