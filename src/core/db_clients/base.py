from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseVectorDB(ABC):
    """
    Standard Abstract Interface for Vector Databases.
    Ensures consistency across Qdrant, Weaviate, and Milvus.
    """
    
    @abstractmethod
    def connect(self) -> None:
        """Initialize the connection to the DB instance."""
        pass
        
    @abstractmethod
    def insert(self, chunks: List[str], embeddings: List[List[float]], metadata: List[Dict[str, Any]] = None) -> bool:
        """Perform bulk insertion of chunks and vectors."""
        pass
        
    @abstractmethod
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        """Search for Approximate Nearest Neighbors (ANN)."""
        pass
