from dotenv import load_dotenv

load_dotenv()


def chunk_text_semantically(text: str) -> list[str]:
    if not text.strip():
        return []
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    chunks = []
    current_chunk = ""
    for paragraph in paragraphs:
        # Skip empty paragraphs
        if not paragraph:
            continue
        if current_chunk and len(current_chunk) + len(paragraph) > 1500:
            chunks.append(current_chunk)
            current_chunk = paragraph
        else:
            current_chunk += "\n\n" + paragraph if current_chunk else paragraph
    if current_chunk:
        chunks.append(current_chunk)
    return chunks
