import os
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
import uuid
import os
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Define where Chroma will store its local database
DATA_DIR = os.getenv("DATA_DIR", str(Path(__file__).parent.parent.parent))
CHROMA_DB_DIR = Path(DATA_DIR) / "chroma_db"
_embeddings = None

class FallbackGoogleEmbeddings:
    def __init__(self):
        self.primary = GoogleGenerativeAIEmbeddings(
            model="gemini-embedding-001",
            google_api_key=os.getenv("LLM_API_KEY")
        )
        self.fallback = GoogleGenerativeAIEmbeddings(
            model="gemini-embedding-001",
            google_api_key=os.getenv("LLM_API_KEY")
        )

    def embed_documents(self, texts):
        try:
            return self.primary.embed_documents(texts)
        except Exception as e:
            print(f"Primary embedding failed ({e}). Falling back to embedding-001...")
            return self.fallback.embed_documents(texts)

    def embed_query(self, text):
        try:
            return self.primary.embed_query(text)
        except Exception as e:
            print(f"Primary embedding query failed ({e}). Falling back to embedding-001...")
            return self.fallback.embed_query(text)

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = FallbackGoogleEmbeddings()
    return _embeddings

class ExtractedQuote(BaseModel):
    quote: str = Field(description="The exact text of the quote extracted from the context")
    relevance: str = Field(description="A brief explanation of why this quote matches the user's prompt")

def get_vectorstore():
    return Chroma(
        collection_name="quotes_collection",
        embedding_function=get_embeddings(),
        persist_directory=str(CHROMA_DB_DIR)
    )

def ingest_document(file_path: str, source_name: str, user_id: int) -> int:
    """
    Loads a PDF or TXT, chunks it, and stores the chunks in ChromaDB with the source metadata and user ID.
    Returns the number of chunks indexed.
    """
    if file_path.lower().endswith('.pdf'):
        loader = PyPDFLoader(file_path)
    elif file_path.lower().endswith('.txt'):
        loader = TextLoader(file_path)
    else:
        raise ValueError(f"Unsupported file type for {file_path}")
        
    docs = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=2000,
        chunk_overlap=400,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    
    chunks = text_splitter.split_documents(docs)
    
    # Add source metadata
    for chunk in chunks:
        chunk.metadata["source_name"] = source_name
        chunk.metadata["user_id"] = user_id
        
    vectorstore = get_vectorstore()
    
    # Process in smaller batches with exponential backoff to handle rate limits
    batch_size = 5
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        
        max_retries = 5
        for attempt in range(max_retries):
            try:
                vectorstore.add_documents(batch)
                break
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    if attempt < max_retries - 1:
                        sleep_time = 15 * (2 ** attempt)
                        print(f"Rate limited (429). Retrying in {sleep_time} seconds (attempt {attempt + 1}/{max_retries})...")
                        time.sleep(sleep_time)
                    else:
                        print("Max retries exceeded for this batch.")
                        raise
                else:
                    raise
        
        # Base sleep to proactively avoid hitting the rate limit
        if i + batch_size < len(chunks):
            time.sleep(10)
    
    return len(chunks)

def extract_quotes(prompt: str, user_id: int, limit: int = 3):
    """
    Retrieves the most relevant chunks based on the prompt, and uses an LLM to extract the best quotes.
    """
    vectorstore = get_vectorstore()
    # Retrieve top K chunks (e.g. 5) filtered by user_id
    results = vectorstore.similarity_search(prompt, k=5, filter={"user_id": user_id})
    
    if not results:
        return []
        
    # Combine chunks into context
    context = "\n\n---\n\n".join([f"Source: {doc.metadata.get('source_name', 'Unknown')}\nText:\n{doc.page_content}" for doc in results])
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash-lite", 
        temperature=0, 
        google_api_key=os.getenv("LLM_API_KEY")
    )
    parser = JsonOutputParser(pydantic_object=ExtractedQuote)
    
    prompt_template = PromptTemplate(
        template="""You are an expert literary assistant tasked with finding perfect quotes based on a user's prompt.
You have been provided with excerpts from documents.

USER PROMPT: {prompt}

DOCUMENT EXCERPTS:
{context}

TASK: Find the best, most impactful quote(s) from the provided excerpts that match the user's prompt.
Extract exactly {limit} quote(s) if possible, or fewer if the excerpts don't contain enough relevant material.
Ensure you copy the quote exactly as written in the text.

{format_instructions}
Return a JSON array of objects.
""",
        input_variables=["prompt", "context", "limit"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )
    
    chain = prompt_template | llm | parser
    
    try:
        parsed = chain.invoke({
            "prompt": prompt,
            "context": context,
            "limit": limit
        })
    except Exception as e:
        print(f"Error parsing LLM output: {e}")
        return []
        
    # Standardize output to list
    if not isinstance(parsed, list):
        parsed = [parsed]
        
    # Append the source from the context
    # Note: A real system might map back to exact chunks, but for MVP we will just return the quote
    # and let the user add the author/source in the UI.
    return parsed

def clear_user_documents(user_id: int):
    """
    Clears all documents and vectors from ChromaDB for a specific user.
    """
    vectorstore = get_vectorstore()
    try:
        # Get all ids for the user
        results = vectorstore.get(where={"user_id": user_id})
        if results and results["ids"]:
            vectorstore.delete(ids=results["ids"])
            return len(results["ids"])
        return 0
    except Exception as e:
        print(f"Error clearing user documents: {e}")
        return 0

