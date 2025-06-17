from langchain_core.embeddings import Embeddings
from dotenv import load_dotenv
import os
from google import genai
from google.genai import types

load_dotenv()


class GeminiEmbeddings(Embeddings):
    """
    LangChain-compatible wrapper for Google Gemini embeddings with batch support.
    Inherits from LangChain's Embeddings base class.
    """

    def __init__(self, model_name: str = "gemini-embedding-exp-03-07"):
        self.model_name = model_name
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.max_batch_size = 1000  # Gemini's maximum batch size per API call

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """
        Embed a list of documents with automatic batching.
        Uses RETRIEVAL_DOCUMENT task type for processing.
        """
        try:
            # If the number of texts is within the batch limit, process in one go
            if len(texts) <= self.max_batch_size:
                return self._embed_batch(texts)
            # For large batches, split into chunks
            embeddings = []
            for i in range(0, len(texts), self.max_batch_size):
                batch = texts[i:i + self.max_batch_size]
                batch_embeddings = self._embed_batch(batch)
                embeddings.extend(batch_embeddings)
            return embeddings
        except Exception as e:
            print(f"Error generating document embeddings: {e}")
            raise e

    def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Process a single batch of texts (up to max_batch_size)"""
        result = self.client.models.embed_content(
            model=self.model_name,
            contents=texts,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=3072
            )
        )
        return [embedding.values for embedding in result.embeddings]

    def embed_query(self, text: str) -> list[float]:
        """
        Embed a single query text.
        Uses RETRIEVAL_QUERY task type for processing.
        """
        try:
            result = self.client.models.embed_content(
                model=self.model_name,
                contents=text,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_QUERY",
                    output_dimensionality=3072
                )
            )
            return result.embeddings[0].values
        except Exception as e:
            print(f"Error generating query embedding: {e}")
            raise e


# Initialize the Gemini embedding model.
embedding_model = GeminiEmbeddings()


def embed_documents(texts: list[str]) -> list[list[float]]:
    return embedding_model.embed_documents(texts)


def embed_query(text: str) -> list[float]:
    return embedding_model.embed_query(text)
