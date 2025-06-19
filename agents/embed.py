from dotenv import load_dotenv
import os
from openai import AzureOpenAI
from langchain_openai import AzureOpenAIEmbeddings

# Load environment variables
load_dotenv()

# Azure OpenAI client setup
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_EMBEDDING_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_EMBEDDING_ENDPOINT"),
    api_version="2023-05-15",  # Fixed the API version format
)

# Replace this with your actual embedding deployment name in Azure
EMBEDDING_DEPLOYMENT_NAME = "text-embedding-3-small"

# LangChain Azure OpenAI Embeddings model
embedding_model = AzureOpenAIEmbeddings(
    azure_deployment=EMBEDDING_DEPLOYMENT_NAME,
    azure_endpoint=os.getenv("AZURE_OPENAI_EMBEDDING_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_EMBEDDING_KEY"),
    api_version="2023-05-15",
)

def get_embeddings(arr: list[str]) -> list[list[float]]:
    try:
        response = client.embeddings.create(
            input=arr,
            model=EMBEDDING_DEPLOYMENT_NAME
        )
        embeddings = [record.embedding for record in response.data]
        return embeddings
    except Exception as e:
        print(f"[ERROR] Embedding generation failed: {e}")
        return []
