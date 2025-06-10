from dotenv import load_dotenv
import os
import openai
from langchain_openai import OpenAIEmbeddings

LLM_MODEL = "gpt-3.5-turbo" 

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

embedding_model = OpenAIEmbeddings(
    model="text-embedding-3-small",
    openai_api_key=openai.api_key
)

EMBEDDING_MODEL = "text-embedding-3-small"

# Length of each embedding is 1536 for text-embedding-3-small
def get_embeddings(arr:list) -> list[list[float]]:
    
    response = openai.embeddings.create(
        input=arr,
        model=EMBEDDING_MODEL    
    )
    
    embeddings = [record.embedding for record in response.data]
    
    return embeddings