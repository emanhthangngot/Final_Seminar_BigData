import io
from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter
from src.config import CHUNK_SIZE, CHUNK_OVERLAP
from src.core.utils.logger import logger


def load_and_chunk_pdf(file_path: str) -> List[str]:
    """
    Load a PDF and split into chunks.

    Uses PyMuPDF (fitz) for 3-10x faster extraction than pypdf.
    Falls back to PyPDFLoader if fitz is unavailable.
    """
    try:
        pages_text = _extract_text_fast(file_path)
    except Exception as exc:
        logger.warning(
            "[Processor] Fast PDF extraction failed (%s), falling back to PyPDFLoader.", exc
        )
        pages_text = _extract_text_fallback(file_path)

    if not pages_text:
        logger.error("[Processor] No text extracted from %s", file_path)
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ".", "!", "?", " ", ""],
    )

    chunks = splitter.split_text(pages_text)
    logger.info(
        "[Processor] Extracted text and split into %d chunks (chunk_size=%d, overlap=%d).",
        len(chunks), CHUNK_SIZE, CHUNK_OVERLAP,
    )
    return chunks


def _extract_text_fast(file_path: str) -> str:
    """Extract all text from a PDF using PyMuPDF (fitz) — 3-10x faster."""
    import fitz  # PyMuPDF

    doc = fitz.open(file_path)
    parts = []
    for page in doc:
        parts.append(page.get_text())
    doc.close()
    return "\n\n".join(parts)


def _extract_text_fallback(file_path: str) -> str:
    """Fallback: use LangChain's PyPDFLoader (slower but always available)."""
    from langchain_community.document_loaders import PyPDFLoader

    loader = PyPDFLoader(file_path)
    documents = loader.load()
    return "\n\n".join(doc.page_content for doc in documents)


def chunk_text(text: str) -> List[str]:
    """Directly chunk text if already extracted"""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP
    )
    return splitter.split_text(text)
