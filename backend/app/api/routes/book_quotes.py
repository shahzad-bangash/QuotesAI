import os
import requests
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.api.auth_deps import get_current_user
from app.database import models
from sqlalchemy.orm import Session
from app.database.database import get_db
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Setup LLM
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("LLM_API_KEY")
llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite", 
    temperature=0, 
    google_api_key=api_key
)

class ExtractedQuote(BaseModel):
    text: str = Field(description="The exact text of the quote")
    author: str = Field(description="The author of the quote")
    source: str = Field(description="The book title the quote is from")

class QuoteExtractionOutput(BaseModel):
    quotes: List[ExtractedQuote] = Field(description="List of extracted quotes")

def fallback_generate_quotes(book_name: str) -> List[ExtractedQuote]:
    """Fallback: Generate famous quotes if text cannot be downloaded."""
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a literary expert. The user requested quotes from the book '{book_name}'. Please provide 3 to 5 famous, exact, and meaningful quotes from this book. Ensure they are accurate."),
        ("human", "Book: {book_name}")
    ])
    structured_llm = llm.with_structured_output(QuoteExtractionOutput)
    chain = prompt | structured_llm
    
    result = chain.invoke({"book_name": book_name})
    return result.quotes

def extract_quotes_from_text(book_name: str, author: str, text: str) -> List[ExtractedQuote]:
    """Extract quotes from actual text."""
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert at finding profound and meaningful quotes in literature. Read the following text excerpt from the book '{book_name}' by '{author}' and extract 3 to 5 of the most meaningful, exact quotes from it."),
        ("human", "Text excerpt:\n\n{text}")
    ])
    structured_llm = llm.with_structured_output(QuoteExtractionOutput)
    chain = prompt | structured_llm
    
    result = chain.invoke({"book_name": book_name, "author": author, "text": text})
    return result.quotes

@router.get("/search")
def search_book_quotes(
    query: str = Query(..., description="Name of the book or author to search for"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.is_admin:
        if current_user.book_quotes_search_count is not None and current_user.book_quotes_search_count >= 3:
            raise HTTPException(status_code=403, detail="You have reached the free limit of 3 book quote searches. Please contact an admin to increase limits.")
        
        current_user.book_quotes_search_count = (current_user.book_quotes_search_count or 0) + 1
        db.commit()

    try:
        # Step 1: Search Gutendex
        gutendex_url = f"https://gutendex.com/books/?search={query}"
        response = requests.get(gutendex_url, timeout=10)
        
        if response.status_code != 200:
            return {"quotes": [q.model_dump() for q in fallback_generate_quotes(query)]}
            
        data = response.json()
        if not data.get("results"):
            # Not found on Gutendex, use LLM memory
            return {"quotes": [q.model_dump() for q in fallback_generate_quotes(query)]}
            
        first_book = data["results"][0]
        book_title = first_book.get("title", query)
        authors = first_book.get("authors", [])
        author_name = authors[0]["name"] if authors else "Unknown"
        
        # Step 2: Find a text URL
        formats = first_book.get("formats", {})
        text_url = None
        for k, v in formats.items():
            if "text/plain" in k:
                text_url = v
                break
                
        if not text_url:
            return {"quotes": [q.model_dump() for q in fallback_generate_quotes(query)]}
            
        # Step 3: Download text (temporarily in memory, max 30,000 characters to avoid huge payload)
        text_response = requests.get(text_url, timeout=15)
        if text_response.status_code != 200:
            return {"quotes": [q.model_dump() for q in fallback_generate_quotes(query)]}
            
        full_text = text_response.text
        
        # Strip generic Project Gutenberg header if possible (usually a few hundred lines), 
        # but for simplicity we'll just take a middle chunk where actual story happens.
        # Most headers end around line 400.
        start_idx = full_text.find("*** START OF THE PROJECT GUTENBERG EBOOK")
        if start_idx != -1:
            full_text = full_text[start_idx + 50:]
            
        # Take a slice of text to feed to LLM (Gemini 1.5 flash has large context, but we keep it reasonable)
        excerpt = full_text[:40000] 
        
        # Step 4: Extract quotes
        extracted = extract_quotes_from_text(book_title, author_name, excerpt)
        
        return {"quotes": [q.model_dump() for q in extracted]}

    except Exception as e:
        print(f"Error fetching quotes: {e}")
        # Try LLM fallback if anything crashes
        try:
            return {"quotes": [q.model_dump() for q in fallback_generate_quotes(query)]}
        except:
            raise HTTPException(status_code=500, detail="Failed to fetch or generate quotes.")
