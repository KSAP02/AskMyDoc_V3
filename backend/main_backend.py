from fastapi import FastAPI, UploadFile, File, Form
from pydantic import BaseModel
import uvicorn
import fitz # PyMuPdf
from dotenv import load_dotenv
import docx2txt
import os
from agents.chunking import chunk_text_semantically
from agents.embed import get_embeddings, embedding_model
from agents.chatbot import get_llm_response
import faiss
from langchain.schema import Document
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_community.vectorstores import FAISS
import numpy as np
from uuid import uuid4


app = FastAPI()
# ----------------------------------- CLASSES AND GLOBAL VARIABLES--------------------------------------

# FastAPI does not maintain state between requests, 
# so you need a global storage mechanism for storing the vector database

class VectorDatabase:
    def __init__(self):
        self.vector_store = None  # This will hold the FAISS index
        self.embeddings = embedding_model

    def create_vector_store(self, chunks: list[str], metadatas:list[dict]):
        """Creates and stores the FAISS vector database"""
        
        # print(f"Inside create_vector_store: {len(chunks)} chunks", flush=True)
        # print(chunks)
        embeddings = get_embeddings(chunks)
        dimension = len(embeddings[0])
        
        # print(len(embeddings), flush=True)
        # Create FAISS index
        faiss_index = faiss.IndexFlatL2(dimension)
        faiss_index.add(np.array(embeddings, dtype=np.float32))

        # Create a document store
        documents_dict = {
            str(i): Document(page_content=chunks[i], metadata=metadatas[i])
            for i in range(len(chunks))
        }
        docstore = InMemoryDocstore(documents_dict)

        index_to_docstore_id = {i: str(i) for i in range(len(chunks))}

        # Store in global object
        self.vector_store = FAISS(
            index=faiss_index,
            docstore=docstore,
            index_to_docstore_id=index_to_docstore_id,
            embedding_function=self.embeddings,
        )

# Global vector database instance
vector_db = VectorDatabase()

# Initialize Global variables
page_vector_dbs: list[VectorDatabase] = []  # This will hold the vector databases for each page
page_chunks: list[list[str]] = []  # This will hold the chunks for each page where chunks is: list[str]


# ----------------------------------- CORE FUNCTIONS -----------------------------------

# Extract text from PDF and return a list of strings, each representing a page's text.
def extract_pdf_pages(file_bytes: bytes) -> list[str]:
    """
    Extracts text from each page of a PDF and returns a list where each index corresponds to a page.
    
    :param file_bytes: The raw bytes of the PDF file
    :return: List of strings, each string is the text from one page
    """
    pages_text = []

    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
         return [page.get_text().strip() for page in doc]
     
# Extracts text from a PDF file and returns the full document text as a single string.
def parse_file_contents(file_bytes: bytes) -> str:
    """Returns full document text as a single string."""
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        return "\n".join([page.get_text() for page in doc])
    
# Chunks the text semantically using the SemanticChunker from LangChain for page wise data.
def chunk_page_wise_texts(page_texts: list[str]) -> list[list[str]]:
    """
    For each page's text, create semantic chunks.
    Returns a list where each element is a list of semantic chunks from that page.
    """
    return [chunk_text_semantically(page_text) for page_text in page_texts]

# Chunks the full text of the document semantically and returns a flat list of all chunks.
def chunk_full_text(full_text: str) -> list[str]:
    """
    Semantic chunking of the entire document as one block.
    Returns a flat list of all semantic chunks.
    """
    return chunk_text_semantically(full_text)

# Builds a vector store for each page's chunks and returns a list of vector stores.
# Assume VectorDatabase and vector_db = VectorDatabase() are already defined elsewhere

def build_page_vector_stores(page_chunks: list[list[str]]) -> list[VectorDatabase]:
    """
    Creates a list of vector databases, one for each page's chunks.
    Args:
        page_chunks (List[List[str]]): List of pages, each containing a list of chunked strings.
    Returns:
        List[VectorDatabase]: List of FAISS vector store objects for each page.
    """
    page_vector_dbs = []

    for page_num, chunks in enumerate(page_chunks):
        if not chunks:
            continue  # Skip empty pages
        
        # Create a new vector database instance for this page
        vector_db = VectorDatabase()

        # Generate simple metadata for each chunk
        metadatas = [{"page": page_num, "chunk_id": str(uuid4())} for _ in chunks]

        # Create the vector store for this page
        vector_db.create_vector_store(chunks, metadatas)

        # Append the vector store to the list
        page_vector_dbs.append(vector_db)

    return page_vector_dbs

# Retrieves the context for a given query from the vector database.
def get_context(query: str, page_number: int, top_k: int) -> str:
    """Retrieve top-k relevant chunks from previous, current, and next page vector DBs."""
    # Collect relevant page indices
    page_indices = [page_number - 1, page_number, page_number + 1]
    # print(page_indices, len(page_vector_dbs))
    
    # Boundary check to avoid index errors
    page_indices = [i for i in page_indices if 0 <= i < len(page_vector_dbs)]
    # print(page_indices)
    
    query_embedding = get_embeddings([query])[0]
    context_chunks = []
    
    # Testing print statements
    # print("====== Page-wise Chunks (Preview) ======\n")
    # for i, chunks in enumerate(page_chunks[:2]):
    #     print(f"Page {i + 1}:")
    #     for j, chunk in enumerate(chunks):
    #         print(f"  Chunk {j + 1}: {(chunk)}...\n")
    #     # print("-" * 50)

    for idx in page_indices:
        vector_db = page_vector_dbs[idx]
        chunks = page_chunks[idx]

        if vector_db.vector_store is None:
            continue  # Skip if vector store not initialized

        distances, indices = vector_db.vector_store.index.search(
            np.array([query_embedding], dtype=np.float32), k=top_k
        )

        retrieved = [chunks[i] for i in indices[0] if i < len(chunks)]
        context_chunks.extend(retrieved)

    return "\n\n".join(context_chunks)


# ------------------------------- DATA MODELS FOR ENDPOINTS-------------------------------
class pdfParserRequest(BaseModel):
    file: UploadFile = File(...)

class QueryResponseRequest(BaseModel):
    query: str
    page_num: int # include a less than operator to avoid out of bounds error
    chat_history: list[dict] # List of dictionaries with 'role' and 'content'
    
# ------------------------------- FAST API ENDPOINTS -------------------------------
@app.post("/parse_pdf")
async def parse_pdf(file: UploadFile = File(...)):
    global page_chunks, page_vector_dbs
    
    contents = await file.read()
    
    try:
        page_wise_texts = extract_pdf_pages(contents)
        full_text = parse_file_contents(contents)

        # Store or process here (e.g., save to disk/db, start chunking etc.)
        # For now we just keep them as variables (example):
        print(f"[INFO] Parsed {len(page_wise_texts)} pages")
        print(f"[INFO] Full text length: {len(full_text)} characters")

    except Exception as e:
        return {"error": str(e)}
    
    # Create chunks of page wise text and ful text
    page_chunks = chunk_page_wise_texts(page_wise_texts)  # List[List[str]] its a list of chunks for each page
    full_chunks = chunk_full_text(full_text)              # List[str] its a list of chunks of the entire text
    
    # convert page_chunks to a list of embeddings for each page and store in a vectorDB
    page_vector_dbs = build_page_vector_stores(page_chunks)
    print(f"Vector stores created: {len(page_vector_dbs)}")
    
    return "Parsed and chunked successfully."

@app.post("/query_response")
async def query_response(request: QueryResponseRequest):
    top_k = 3  # Number of top relevant chunks to retrieve
    
    # if request.page_num < 1 or request.page_num > len(page_vector_dbs):
    #     return {"error": "Page number out of bounds."}
    print(request.page_num)
    
    context = get_context(request.query, request.page_num, top_k)
    print(f"Context retrieved for page {request.page_num}: {context[:100]}...")  # Print first 100 chars for brevity
    return get_llm_response(
        user_query=request.query, 
        context=context, 
        chat_history=request.chat_history
    )
    
# ---------------------------- TESTING ENTRY POINT FOR TERMINAL ----------------------------
def preview_chunks(page_chunks: list[list[str]], full_chunks: list[str], page_limit: int = 2, chunk_limit: int = 3):
    print("====== Page-wise Chunks (Preview) ======\n")
    for i, chunks in enumerate(page_chunks[:page_limit]):
        print(f"Page {i + 1}:")
        for j, chunk in enumerate(chunks[:chunk_limit]):
            print(f"  Chunk {j + 1}: {(chunk)}...\n")
        print("-" * 50)

    print("\n====== Full Document Chunks (Preview) ======\n")
    for i, chunk in enumerate(full_chunks[:chunk_limit]):
        print(f"Chunk {i + 1}: {(chunk)}...\n")
    print("-" * 50)

# MAIN FUNCTION TO RUN THE BACKEND TESTING
# import tkinter as tk
# from tkinter import filedialog

# def main():
#     global page_chunks, page_vector_dbs
    
#     # Hide the main tkinter window
#     root = tk.Tk()
#     root.withdraw()

#     # Open the file dialog to select PDF or DOCX
#     file_path = filedialog.askopenfilename(
#         title="Select a PDF or DOCX file",
#         filetypes=[("PDF files", "*.pdf"), ("Word Documents", "*.docx *.doc")]
#     )

#     if not file_path:
#         print("No file selected.")
#         return

#     file_name = os.path.basename(file_path)
#     with open(file_path, "rb") as f:
#         file_bytes = f.read()
        
#     page_wise_parsed = extract_pdf_pages(file_bytes)
#     # for i, page in enumerate(page_wise_parsed):
#     #     print(f"\n--- Page {i+1} ---\n{page}")

#     try:
#         complete_parsed_text = parse_file_contents(file_bytes)
#         # print("\n--- Extracted Text Start ---\n")
#         # print(complete_parsed_text)
#         # print("\n--- Extracted Text End ---")
#     except ValueError as e:
#         print(f"Error: {e}")
    
#     page_chunks = chunk_page_wise_texts(page_wise_parsed)  # List[List[str]] its a list of chunks for each page
#     full_chunks = chunk_full_text(complete_parsed_text)    # List[str] its a list of chunks of the entire text
    
#     # Call this after generating your chunks
#     # preview_chunks(page_chunks, full_chunks)
    
#     # convert page_chunks to a list of embeddings for each page and store in a vectorDB
#     page_vector_dbs = build_page_vector_stores(page_chunks)
#     print(f"Vector stores created: {len(page_vector_dbs)}")
    
#     for i, db in enumerate(page_vector_dbs):
#         print(f"DB {i} type: {type(db)}")
        
#     context = get_context("Zero-Shot Multi-Task Rearrangement", page_number=4, top_k=2)
#     print(f"Context retrieved: {context}")
    
#     result = get_llm_response(
#         user_query="""Explain during NeRF training, this encourages the space around the
#  object to be represented as empty, which will later allow
#  us to freely move this object around the scene and render
#  it from novel poses. Since we move the entire foreground
#  NeRF, this empty space supervision is important to allow the
#  two NeRFs to be rendered together correctly.
#  Give me a detailed explanation of this paragraph and the words used in it.""",
#         context=context, 
#         chat_history=[]
#     )
    
#     print(f"\n\n\nLLM Response: {result}")

# ---------------------------- RUN MODE ----------------------------

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
    # Run using : "uvicorn backend.main_backend:app --host 127.0.0.1 --port 8000 --reload"
    # main()
    # conda activate "D:\Projects\AI Apps\Agents\AskMyDoc\askmydoc_venv"