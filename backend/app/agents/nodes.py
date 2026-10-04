import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.agents.state import GraphState, ContentAnalysisOutput, StyleSelectionOutput
from dotenv import load_dotenv

load_dotenv()

# Initialize LLM, explicitly passing the api_key if they used LLM_API_KEY
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("LLM_API_KEY")
llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite", 
    temperature=0, 
    google_api_key=api_key
)

def content_agent_node(state: GraphState) -> GraphState:
    """
    Analyzes the raw quote to understand its semantics.
    """
    print(f"--- CONTENT AGENT --- Analyzing: {state['quote'][:30]}...")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert content analyzer. Read the provided quote and extract its topic, tone, and emotion."),
        ("human", "Quote: {quote}\nAuthor: {author}")
    ])
    
    structured_llm = llm.with_structured_output(ContentAnalysisOutput)
    chain = prompt | structured_llm
    
    analysis = chain.invoke({
        "quote": state["quote"], 
        "author": state.get("author", "Unknown")
    })
    
    return {
        "quote": analysis.quote,
        "author": analysis.author,
        "topic": analysis.topic,
        "tone": analysis.tone,
        "emotion": analysis.emotion,
        "caption": analysis.caption,
        "hashtags": analysis.hashtags
    }


def style_agent_node(state: GraphState) -> GraphState:
    """
    Selects the best visual style based on the content analysis.
    """
    print(f"--- STYLE AGENT --- Choosing style for tone: {state['tone']}")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a master designer. Choose the best visual style for the quote based on its semantics.
        Available styles:
        - light: Clean, high-contrast, black on white. Best for general advice, clear thoughts, or neutral quotes.
        - dark: Deep charcoal night mode, crisp white text. Best for deep, mysterious, tech, or intense quotes.
        - theme-crimson: Aggressive deep maroon with blood-red accents. Best for highly motivational, angry, passionate, or loud quotes.
        - theme-cyber: Futuristic deep navy with glowing neon cyan accents. Best for sci-fi, programming, cyberpunk, or futuristic quotes.
        
        Strictly output one of the exact names above."""),
        ("human", "Quote: {quote}\nTopic: {topic}\nTone: {tone}\nEmotion: {emotion}")
    ])
    
    structured_llm = llm.with_structured_output(StyleSelectionOutput)
    chain = prompt | structured_llm
    
    selection = chain.invoke({
        "quote": state["quote"],
        "topic": state["topic"],
        "tone": state["tone"],
        "emotion": state["emotion"]
    })
    
    # Enforce constraints just in case the LLM hallucinates
    valid_styles = ["light", "dark", "theme-crimson", "theme-cyber"]
    final_style = selection.selected_style if selection.selected_style in valid_styles else "light"
    
    print(f"--- STYLE AGENT --- Selected: {final_style} (Reason: {selection.reasoning})")
    
    return {
        "suggested_style": final_style
    }
