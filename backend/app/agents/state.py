from typing import TypedDict, Optional
from pydantic import BaseModel, Field

# The state dictionary that flows through our LangGraph nodes
class GraphState(TypedDict):
    quote: str
    author: Optional[str]
    source: Optional[str]
    topic: Optional[str]
    tone: Optional[str]
    emotion: Optional[str]
    suggested_style: Optional[str]
    caption: Optional[str]
    hashtags: Optional[list[str]]

# Pydantic schemas for the LLM structured outputs
class ContentAnalysisOutput(BaseModel):
    author: str = Field(description="The author of the quote. If unknown, use 'Unknown'")
    quote: str = Field(description="The exact quote text, corrected for grammar if necessary")
    caption: str = Field(description="An engaging social media caption for this quote, written in a thoughtful tone, without hashtags")
    hashtags: list[str] = Field(description="A list of 5-8 relevant hashtags for Instagram (e.g., '#stoicism', '#motivation')")
    topic: str = Field(description="The main topic of the quote (e.g. discipline, love, history)")
    tone: str = Field(description="The tone of the quote (e.g. motivational, somber, aggressive, calm)")
    emotion: str = Field(description="The primary emotion conveyed by the text")

class StyleSelectionOutput(BaseModel):
    selected_style: str = Field(description="Must be one of: 'mental_notes', 'minimal', 'dark', 'bold'")
    reasoning: str = Field(description="Why this style was chosen")
