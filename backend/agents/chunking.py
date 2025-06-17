from dotenv import load_dotenv
import re

load_dotenv()


def chunk_text_semantically(text: str) -> list[str]:
    """
    Improved semantic chunking that creates multiple meaningful chunks per page
    """
    if not text.strip():
        return []
    # Clean the text first
    text = text.strip()
    # Split by multiple newlines (paragraphs) but also handle single newlines
    # This regex splits on 2+ newlines OR single newlines followed by capital letters (new sentences)
    paragraphs = re.split(r'\n{2,}|\n(?=[A-Z])', text)
    paragraphs = [p.strip() for p in paragraphs if p.strip()]
    if not paragraphs:
        return [text]  # Return original text if no paragraphs found
    chunks = []
    current_chunk = ""
    min_chunk_size = 200  # Minimum chunk size to avoid tiny chunks
    max_chunk_size = 1200  # Reduced from 1500 for better granularity
    for paragraph in paragraphs:
        # Skip very short paragraphs (likely page numbers, headers)
        if len(paragraph) < 10:
            continue
        # If adding this paragraph would exceed max size, save current chunk
        if current_chunk and len(current_chunk) + len(paragraph) + 2 > max_chunk_size:
            if len(current_chunk) >= min_chunk_size:
                chunks.append(current_chunk.strip())
                current_chunk = paragraph
            else:
                # Current chunk is too small, try to add one more paragraph
                current_chunk += "\n\n" + paragraph
        else:
            # Add paragraph to current chunk
            if current_chunk:
                current_chunk += "\n\n" + paragraph
            else:
                current_chunk = paragraph
    # Add the last chunk if it exists and meets minimum size
    if current_chunk:
        if len(current_chunk) >= min_chunk_size:
            chunks.append(current_chunk.strip())
        elif chunks:
            # If last chunk is too small, merge with previous chunk
            chunks[-1] += "\n\n" + current_chunk
        else:
            # If it's the only chunk, keep it regardless of size
            chunks.append(current_chunk.strip())
    # Fallback: if we still have no chunks, split by sentences
    if not chunks:
        chunks = split_by_sentences(text, max_chunk_size)
    # Ensure we have at least one chunk
    if not chunks:
        chunks = [text]
    return chunks


def split_by_sentences(text: str, max_size: int = 1200) -> list[str]:
    """
    Fallback method to split text by sentences when paragraph splitting fails
    """
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current_chunk = ""
    for sentence in sentences:
        if current_chunk and len(current_chunk) + len(sentence) + 1 > max_size:
            if current_chunk.strip():
                chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            if current_chunk:
                current_chunk += " " + sentence
            else:
                current_chunk = sentence
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    return chunks
