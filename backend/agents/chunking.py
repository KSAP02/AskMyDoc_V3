from dotenv import load_dotenv

load_dotenv()

def chunk_text_semantically(text: str) -> list[str]:
    """
    Smart paragraph-based chunking - no API calls needed
    Drop-in replacement for semantic chunking
    """
    if not text.strip():
        return []
    
    # Split by double newlines (paragraphs)
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    
    chunks = []
    current_chunk = ""
    target_size = 1000
    
    for paragraph in paragraphs:
        if len(current_chunk) + len(paragraph) > target_size * 1.5 and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = paragraph
        else:
            current_chunk += "\n\n" + paragraph if current_chunk else paragraph
    
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    print(f"✅ [firefly-638] Fast chunking: {len(chunks)} chunks")
    return chunks

