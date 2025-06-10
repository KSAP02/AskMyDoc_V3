from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

# Initialize the embedding model (can be replaced with Hugging Face if needed)

# The OpenAIEmbeddings class in LangChain looks for your OpenAI API key in the environment variable OPENAI_API_KEY by default.
# You do not need to pass it directly in the code if it is set in your environment.

# How it works:

# When you call OpenAIEmbeddings(), it checks for OPENAI_API_KEY in your environment.
# If the key is not set, you will get an authentication error.

embedding_model = OpenAIEmbeddings()
semantic_chunker = SemanticChunker(embedding_model)

# --------------------- Generic Semantic Chunking Function ---------------------

def chunk_text_semantically(text: str) -> list[str]:
    """Chunk any given text into semantically meaningful pieces."""
    return semantic_chunker.split_text(text)