from langchain_experimental.text_splitter import SemanticChunker
from langchain_core.embeddings import Embeddings
from dotenv import load_dotenv
import os
import time
from google import genai
from google.genai import types

load_dotenv()

class GeminiEmbeddings(Embeddings):
    def __init__(self, model_name: str = "text-embedding-004"):  # Use stable model
        self.model_name = model_name
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.max_batch_size = 5   # Very small batches
        self.rate_limit_delay = 3.0  # 3 seconds between requests
    
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        print(f"🔄 Embedding {len(texts)} texts in batches of {self.max_batch_size}")
        all_embeddings = []
        
        for i in range(0, len(texts), self.max_batch_size):
            batch = texts[i:i + self.max_batch_size]
            
            print(f"📦 Batch {i//self.max_batch_size + 1}/{(len(texts)-1)//self.max_batch_size + 1}: {len(batch)} texts")
            
            result = self.client.models.embed_content(
                model=self.model_name,
                contents=batch,
                config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
            )
            
            batch_embeddings = [embedding.values for embedding in result.embeddings]
            all_embeddings.extend(batch_embeddings)
            
            # Wait between batches
            if i + self.max_batch_size < len(texts):
                print(f"⏳ Waiting {self.rate_limit_delay}s...")
                time.sleep(self.rate_limit_delay)
        
        return all_embeddings
    
    def embed_query(self, text: str) -> list[float]:
        result = self.client.models.embed_content(
            model=self.model_name,
            contents=text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")
        )
        return result.embeddings[0].values

# Same interface as your OpenAI version
embedding_model = GeminiEmbeddings()
semantic_chunker = SemanticChunker(embedding_model)

def chunk_text_semantically(text: str) -> list[str]:
    """Chunk text semantically - no fallback chunking"""
    return semantic_chunker.split_text(text)

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
