from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file


embedding_model = OpenAIEmbeddings()
semantic_chunker = SemanticChunker(embedding_model)

# --------------------- Generic Semantic Chunking Function ---------------------

def chunk_text_semantically(text: str) -> list[str]:
    """Chunk any given text into semantically meaningful pieces."""
    return semantic_chunker.split_text(text)
