from typing import List, Dict, Any
from .base_client import BaseVectorDB
import time

class DummyWrapper(BaseVectorDB):
    """
    Placeholder class logic for testing the UI 
    before merging the actual Database structures.
    """
    
    def connect(self) -> None:
        print("[DummyDB] Faking a successful connection socket...")
        time.sleep(0.5)
        
    def insert(self, chunks: List[str], embeddings: List[List[float]], metadata: List[Dict[str, Any]] = None) -> bool:
        print(f"[DummyDB] Pumping {len(chunks)} chunks into simulated RAM storage.")
        time.sleep(1)
        return True
        
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        print("[DummyDB] Scanning... Extracting simulated contexts.")
        time.sleep(0.3)
        return ["Simulated Context #1: Vector DB is a strong AI narrative.", 
                "Simulated Context #2: RAG serves as an eternal external cache."]
