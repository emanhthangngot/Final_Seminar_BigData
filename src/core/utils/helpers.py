import re

def clean_text(text: str) -> str:
    """Basic text cleaning for RAG context"""
    if not text:
        return ""
    # Remove multiple whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def format_milvus_collection_name(name: str) -> str:
    """Milvus collection names must only contain alphanumeric characters and underscores"""
    return re.sub(r'[^a-zA-Z0-9_]', '_', name)
