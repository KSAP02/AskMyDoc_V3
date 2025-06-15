from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import uvicorn
import fitz  # PyMuPdf
from dotenv import load_dotenv
import os
from agents.embed import embed_documents, embed_query, chunk_text_semantically, embedding_model
from agents.chatbot import get_llm_response
import faiss
from langchain.schema import Document
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_community.vectorstores import FAISS
import numpy as np
from uuid import uuid4
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(title="AskMyDoc Backend", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------- GLOBAL VARIABLES--------------------------------------
page_vector_dbs: list = []
page_chunks: list[list[str]] = []

# ----------------------------------- CLASSES--------------------------------------
class VectorDatabase:
    def __init__(self):
        self.vector_store = None
        self.embeddings = embedding_model

    def create_vector_store(self, chunks: list[str], metadatas: list[dict]):
        """Creates and stores FAISS vector database"""
        embeddings = embed_documents(chunks)
        dimension = len(embeddings[0])

        # Create faiss index
        faiss_index = faiss.IndexFlatL2(dimension)
        faiss_index.add(np.array(embeddings, dtype=np.float32))

        # Create document store
        documents_dict = {
            str(i): Document(page_content=chunks[i], metadata=metadatas[i])
            for i in range(len(chunks))
        }
        docstore = InMemoryDocstore(documents_dict)
        index_to_docstore_id = {i: str(i) for i in range(len(chunks))}

        self.vector_store = FAISS(
            index=faiss_index,
            docstore=docstore,
            index_to_docstore_id=index_to_docstore_id,
            embedding_function=self.embeddings
        )

# ----------------------------------- CORE FUNCTIONS -----------------------------------
def extract_pdf_pages(file_bytes: bytes) -> list[str]:
    """Extracts text from the pdf, returns a list where each index corresponds to a page"""
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        return [page.get_text().strip() for page in doc]

def parse_file_contents(file_bytes: bytes) -> str:
    """Returns the whole doc text as string"""
    pages_text = extract_pdf_pages(file_bytes)
    return "\n\n".join(pages_text)

def chunk_page_wise_texts(page_texts: list[str]) -> list[list[str]]:
    """For each page, create semantic chunks."""
    return [chunk_text_semantically(page_text) for page_text in page_texts]

def chunk_full_text(full_text: str) -> list[str]:
    """Chunks the entire document text semantically"""
    return chunk_text_semantically(full_text)

def build_page_vector_stores(page_chunks: list[list[str]]) -> list:
    """Creates a list of vector databases, one for each page's chunks"""
    page_vector_dbs_local = []

    for page_num, chunks in enumerate(page_chunks):
        if not chunks:
            continue

        vector_db = VectorDatabase()
        metadatas = [{"page": page_num, "chunk_id": str(uuid4())} for _ in chunks]
        vector_db.create_vector_store(chunks, metadatas)
        page_vector_dbs_local.append(vector_db)

    return page_vector_dbs_local

def get_context(query: str, page_number: int, top_k: int) -> str:
    """Retrieve top-k relevant chunks from previous, current, and next page vector DBs."""
    page_indices = [page_number-1, page_number, page_number + 1]
    page_indices = [i for i in page_indices if 0 <= i < len(page_vector_dbs)]

    query_embedding = embed_query(query)
    context_chunks = []

    for idx in page_indices:
        vector_db = page_vector_dbs[idx]
        chunks = page_chunks[idx]

        if vector_db.vector_store is None:
            continue

        distances, indices = vector_db.vector_store.index.search(
            np.array([query_embedding], dtype=np.float32), k=top_k
        )

        retrieved = [chunks[i] for i in indices[0] if i < len(chunks)]
        context_chunks.extend(retrieved)

    return "\n\n".join(context_chunks)

# ------------------------------- DATA MODELS-------------------------------
class QueryResponseRequest(BaseModel):
    query: str
    page_num: int
    chat_history: list[dict] = []

# ------------------------------- FAST API ENDPOINTS -------------------------------
@app.get("/")
async def root():
    return {
        "message": "AskMyDoc Backend is running!",
        "user": "firefly-638",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "available_endpoints": ["/docs", "/parse_pdf", "/query_response"],
        "pages_loaded": len(page_chunks),
        "vector_dbs_created": len(page_vector_dbs)
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "pages_loaded": len(page_chunks),
        "vector_dbs": len(page_vector_dbs)
    }

@app.post("/parse_pdf")
async def parse_pdf(file: UploadFile = File(...)):
    global page_chunks, page_vector_dbs
    
    try:
        contents = await file.read()
        page_wise_texts = extract_pdf_pages(contents)
        
        print(f"✅ [firefly-638] Parsed {len(page_wise_texts)} pages from {file.filename}")
        
        # Create chunks
        page_chunks = chunk_page_wise_texts(page_wise_texts)
        
        # Build vector stores
        page_vector_dbs = build_page_vector_stores(page_chunks)
        
        print(f"✅ [firefly-638] Created {len(page_vector_dbs)} vector stores")
        
        return {
            "document_id": f"doc_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_firefly638",
            "message": "PDF parsed and chunked successfully",
            "filename": file.filename,
            "total_pages": len(page_wise_texts),
            "vector_stores_created": len(page_vector_dbs),
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "user": "firefly-638"
        }
        
    except Exception as e:
        print(f"❌ [firefly-638] Error parsing PDF: {e}")
        return {"error": f"Failed to parse PDF: {str(e)}"}

@app.post("/query_response")
async def query_response(request: QueryResponseRequest):
    try:
        top_k = 3
        
        print(f"🔍 [firefly-638] Query: {request.query[:50]}... on page {request.page_num}")
        
        context = get_context(request.query, request.page_num, top_k)
        print(f"📄 [firefly-638] Context retrieved: {len(context)} characters")
        
        response = get_llm_response(
            user_query=request.query,
            context=context,
            chat_history=request.chat_history
        )
        
        print(f"🤖 [firefly-638] Response generated: {len(response)} characters")
        
        return {
            "response": response,
            "page_number": request.page_num,
            "context_length": len(context),
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "user": "firefly-638"
        }
        
    except Exception as e:
        print(f"❌ [firefly-638] Error processing query: {e}")
        return {"error": f"Failed to process query: {str(e)}"}

# ---------------------------- TESTING ENTRY POINT FOR TERMINAL ----------------------------
def preview_chunks(page_chunks: list[list[str]], full_chunks: list[str], page_limit: int = 2, chunk_limit: int = 3):
    """Preview chunks for debugging purposes"""
    print("====== Page-wise Chunks (Preview) ======\n")
    for i, chunks in enumerate(page_chunks[:page_limit]):
        print(f"Page {i + 1}:")
        for j, chunk in enumerate(chunks[:chunk_limit]):
            print(f"  Chunk {j + 1}: {chunk[:100]}...\n")
        print("-" * 50)

    print("\n====== Full Document Chunks (Preview) ======\n")
    for i, chunk in enumerate(full_chunks[:chunk_limit]):
        print(f"Chunk {i + 1}: {chunk[:100]}...\n")
    print("-" * 50)

# MAIN FUNCTION TO RUN THE BACKEND TESTING
import tkinter as tk
from tkinter import filedialog

def main():
    """Terminal testing function - restored from original code"""
    global page_chunks, page_vector_dbs
    
    print(f"🚀 [firefly-638] Starting AskMyDoc Backend Testing...")
    print(f"📅 Current Date: 2025-06-15 10:50:12")
    print(f"👤 Current User: firefly-638")
    
    # Hide the main tkinter window
    root = tk.Tk()
    root.withdraw()

    # Open the file dialog to select PDF or DOCX
    file_path = "/home/sid/projects/AskMyDoc_v2/AayushSaini2025Resume.pdf"

    if not file_path:
        print("❌ No file selected.")
        return

    file_name = os.path.basename(file_path)
    print(f"📄 Testing with file: {file_name}")
    
    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()
    except FileNotFoundError:
        print(f"❌ File not found: {file_path}")
        print("📁 Please ensure the test file exists or update the file_path variable")
        return
        
    print(f"✅ File loaded: {len(file_bytes)} bytes")
    
    # Extract pages
    page_wise_parsed = extract_pdf_pages(file_bytes)
    print(f"📑 Extracted {len(page_wise_parsed)} pages")
    
    # Preview pages (optional)
    # for i, page in enumerate(page_wise_parsed[:2]):  # Show first 2 pages
    #     print(f"\n--- Page {i+1} Preview ---\n{page[:200]}...")

    try:
        complete_parsed_text = parse_file_contents(file_bytes)
        print(f"📄 Complete text length: {len(complete_parsed_text)} characters")
        # print("\n--- Extracted Text Start ---\n")
        # print(complete_parsed_text[:500])  # Show first 500 chars
        # print("\n--- Extracted Text End ---")
    except ValueError as e:
        print(f"❌ Error: {e}")
        return
    
    print("🔧 Creating semantic chunks...")
    page_chunks = chunk_page_wise_texts(page_wise_parsed)  # List[List[str]]
    full_chunks = chunk_full_text(complete_parsed_text)    # List[str]
    
    print(f"📊 Page chunks created: {len(page_chunks)} pages")
    print(f"📊 Full document chunks: {len(full_chunks)} chunks")
    
    # Preview chunks (uncomment to see chunk details)
    # preview_chunks(page_chunks, full_chunks)
    
    print("🏗️ Building vector stores...")
    # Convert page_chunks to embeddings and store in vectorDB
    page_vector_dbs = build_page_vector_stores(page_chunks)
    print(f"✅ Vector stores created: {len(page_vector_dbs)}")
    
    # Debug vector stores
    for i, db in enumerate(page_vector_dbs[:3]):  # Show first 3
        print(f"📊 DB {i} type: {type(db)}, has vector_store: {db.vector_store is not None}")
        
    # Test context retrieval
    print("\n🔍 Testing context retrieval...")
    test_query = "Zero-Shot Multi-Task Rearrangement"
    context = get_context(test_query, page_number=4, top_k=2)
    print(f"📄 Context retrieved for '{test_query}': {len(context)} characters")
    print(f"📖 Context preview: {context[:200]}...")
    
    # Test LLM response
    print("\n🤖 Testing LLM response...")
    test_detailed_query = """Explain during NeRF training, this encourages the space around the
 object to be represented as empty, which will later allow
 us to freely move this object around the scene and render
 it from novel poses. Since we move the entire foreground
 NeRF, this empty space supervision is important to allow the
 two NeRFs to be rendered together correctly.
 Give me a detailed explanation of this paragraph and the words used in it."""
    
    result = get_llm_response(
        user_query=test_detailed_query,
        context=context, 
        chat_history=[]
    )
    
    print(f"\n📝 LLM Response ({len(result)} characters):")
    print("=" * 60)
    print(result)
    print("=" * 60)
    
    print(f"\n✅ [firefly-638] Testing completed successfully!")
    print(f"📊 Summary:")
    print(f"   - Pages processed: {len(page_wise_parsed)}")
    print(f"   - Vector stores: {len(page_vector_dbs)}")
    print(f"   - Total chunks: {sum(len(chunks) for chunks in page_chunks)}")

# ---------------------------- RUN MODE ----------------------------
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Run testing mode: python main_backend.py test
        main()
    else:
        # Run FastAPI server
        print(f"🚀 [firefly-638] Starting AskMyDoc Backend Server...")
        print(f"📅 Current Date: 2025-06-15 10:50:12")
        print(f"👤 Current User: firefly-638")
        print(f"🌐 Server will be available at: http://127.0.0.1:8000")
        print(f"📋 API Documentation: http://127.0.0.1:8000/docs")
        uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
