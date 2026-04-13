import io
from typing import List
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from src.config import CHUNK_SIZE, CHUNK_OVERLAP
from src.core.utils.logger import logger

def load_and_chunk_pdf(file_path: str) -> List[str]:
    """
    Load a PDF and split into chunks.
    Note: For Streamlit uploaded files, we usually need to save them temporarily or use a different loader.
    """
    try:
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", ".", "!", "?", " ", ""]
        )
        
        chunks = splitter.split_documents(documents)
        logger.info(f"Loaded {len(documents)} pages and split into {len(chunks)} chunks.")
        
        return [chunk.page_content for chunk in chunks]
    except Exception as e:
        logger.error(f"Error processing PDF {file_path}: {e}")
        return []

def chunk_text(text: str) -> List[str]:
    """Directly chunk text if already extracted"""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP
    )
    return splitter.split_text(text)
