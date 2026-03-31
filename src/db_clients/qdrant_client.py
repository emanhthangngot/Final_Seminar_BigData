from typing import List, Dict, Any
from .base_client import BaseVectorDB
from qdrant_client import QdrantClient
from qdrant_client.http import models

class QdrantWrapper(BaseVectorDB):
    def connect(self) -> None:
        # Open REST API Socket
        self.client = QdrantClient(host="localhost", port=6333)
        
        # Drop if exists and recreate generic collection
        self.client.recreate_collection(
            collection_name="SeminarKnowledge_Base",
            vectors_config=models.VectorParams(
                size=1536, # OpenAI Embedding model dimension constraint
                distance=models.Distance.COSINE # Metric computation setup for Similarity comparison
            )
        )
        print("[Qdrant] Connected and collection initialized via REST.")
        
    def insert(self, chunks: List[str], embeddings: List[List[float]], metadata: List[Dict[str, Any]] = None) -> bool:
        # Qdrant manipulates data exclusively via PointStruct instances
        points_list = []
        for index_id in range(len(chunks)):
            payload_dir = {
                "document_text": chunks[index_id]
            }
            # Create Point (Requires an ID, a float-vector, and JSON payload)
            node = models.PointStruct(
                id=index_id + 1,
                vector=embeddings[index_id],
                payload=payload_dir
            )
            points_list.append(node)
            
        # Push all struct nodes into the collection - Qdrant handles batching / parallel threads natively.
        self.client.upload_points(
            collection_name="SeminarKnowledge_Base", 
            points=points_list
        )
        return True
        
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        # Formulate Search structure (automatically passes through the integrated HNSW algorithmic layer)
        qdrant_hits = self.client.search(
            collection_name="SeminarKnowledge_Base", 
            query_vector=query_embedding, 
            limit=top_k
        )
        
        # Extract the inner JSON payload from ScoredPoint wrapper to retrieve raw string chunks for LLM context
        return [hit.payload["document_text"] for hit in qdrant_hits]
