from langchain_experimental.text_splitter import SemanticChunker
from langchain_core.embeddings import Embeddings
from dotenv import load_dotenv
import os
from google import genai
from google.genai import types

load_dotenv()

class GeminiEmbeddings(Embeddings):
    """
    LangChain-compatible wrapper for Google Gemini embeddings
    Inherits from LangChain's Embeddings base class
    """
    
    def __init__(self, model_name: str = "gemini-embedding-exp-03-07"):
        self.model_name = model_name
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """
        Embed a list of documents for semantic chunking
        Uses RETRIEVAL_DOCUMENT task type for document processing
        """
        try:
            result = self.client.models.embed_content(
                model=self.model_name,
                contents=texts,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT"
                )
            )
            
            # Extract embeddings from the result
            embeddings = [embedding.values for embedding in result.embeddings]
            return embeddings
            
        except Exception as e:
            print(f"Error generating document embeddings: {e}")
            raise e
    
    def embed_query(self, text: str) -> list[float]:
        """
        Embed a single query text
        Uses RETRIEVAL_QUERY task type for query processing
        """
        try:
            result = self.client.models.embed_content(
                model=self.model_name,
                contents=text,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_QUERY"
                )
            )
            
            return result.embeddings[0].values
            
        except Exception as e:
            print(f"Error generating query embedding: {e}")
            raise e

# Initialize the Gemini embedding model
embedding_model = GeminiEmbeddings()

# Create semantic chunker with Gemini embeddings
semantic_chunker = SemanticChunker(embedding_model)


# --------------------- Generic Semantic Chunking Function ---------------------

def chunk_text_semantically(text: str) -> list[str]:
    """
    Chunk any given text into semantically meaningful pieces using Gemini embeddings.
    
    Args:
        text: Input text to be chunked
        
    Returns:
        List of semantically coherent text chunks
    """
    try:
        chunks = semantic_chunker.split_text(text)
        print(f"✅ Text chunked into {len(chunks)} semantic pieces")
        return chunks
    except Exception as e:
        print(f"❌ Error chunking text: {e}")
        # Fallback to simple splitting if semantic chunking fails
        return fallback_chunking(text)

def fallback_chunking(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """
    Fallback chunking method if semantic chunking fails
    Simple text splitting by character count
    """
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # Find the last sentence boundary within the chunk
        if end < len(text):
            # Look for sentence endings near the chunk boundary
            for i in range(end, max(start + chunk_size - 100, start), -1):
                if text[i] in '.!?':
                    end = i + 1
                    break
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        start = end - overlap
        if start >= len(text):
            break
    
    print(f"⚠️ Used fallback chunking: {len(chunks)} chunks")
    return chunks


def embed_documents(texts: list[str]) -> list[list[float]]:
    return embedding_model.embed_documents(texts)

def embed_query(text: str) -> list[float]:
    return embedding_model.embed_query(text)
