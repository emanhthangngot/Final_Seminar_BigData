from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseVectorDB(ABC):
    """
    Standard Abstract Interface enclosing all 3 DB libraries
    to ensure the UI logic doesn't break upon swapping.
    """
    
    @abstractmethod
    def connect(self) -> None:
        """
        Initialize the connection to the Docker Instance 
        and establish/verify the Database Collection Schema.
        """
        pass
        
    @abstractmethod
    def insert(self, chunks: List[str], embeddings: List[List[float]], metadata: List[Dict[str, Any]] = None) -> bool:
        """
        Receives a list of plain strings (Chunks), Float Vector arrays, and optional metadata.
        Performs Format normalization and Bulk Insertions into the DB node.
        """
        pass
        
    @abstractmethod
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        """
        Consumes the Query Vector float arrays and searches for Approximate Nearest Neighbors (ANN).
        Directly parses the response objects back into plain context Text payloads to feed the LLM.
        """
        pass
