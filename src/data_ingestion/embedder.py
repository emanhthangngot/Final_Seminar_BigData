from typing import List
from langchain_community.embeddings import OllamaEmbeddings
from src.config import OLLAMA_BASE_URL, EMBEDDING_MODEL
from src.utils.logger import logger

class Embedder:
    def __init__(self):
        self.embeddings = OllamaEmbeddings(
            base_url=OLLAMA_BASE_URL,
            model=EMBEDDING_MODEL
        )
        logger.info(f"Initialized OllamaEmbeddings with model: {EMBEDDING_MODEL}")

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Batch embed documents"""
        return self.embeddings.embed_documents(texts)

    def embed_query(self, text: str) -> List[float]:
        """Embed a single query"""
        return self.embeddings.embed_query(text)
