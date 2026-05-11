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

    @abstractmethod
    def search_hybrid(
        self,
        query_text: str,
        query_embedding: List[float],
        filters: Dict[str, Any] = None,
        top_k: int = 5,
        alpha: float | None = None,
    ) -> List[str]:
        """Search using a combination of dense vectors and optional metadata filtering or sparse search."""
        pass
        
    @abstractmethod
    def reset_collection(self) -> None:
        """Clear all data in the collection for a fresh benchmark."""
        pass
