from typing import List, Dict, Any
from src.db_clients.base import BaseVectorDB
from qdrant_client import QdrantClient
from qdrant_client.http import models
from src.config import QDRANT_HOST, QDRANT_HTTP_PORT, VECTOR_DIM
from src.benchmark.profiler import time_profiler
from src.utils.logger import logger

class QdrantWrapper(BaseVectorDB):
    def connect(self) -> None:
        # Initialize REST client
        self.client = QdrantClient(host=QDRANT_HOST, port=QDRANT_HTTP_PORT)
        collection_name = "SeminarKnowledge_Base"
        
        # Check if collection exists, if not create it
        collections = self.client.get_collections().collections
        exists = any(c.name == collection_name for c in collections)
        
        if not exists:
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=VECTOR_DIM,
                    distance=models.Distance.COSINE
                )
            )
            logger.info(f"[Qdrant] Collection '{collection_name}' created.")
        else:
            logger.info(f"[Qdrant] Collection '{collection_name}' already exists.")
            
    @time_profiler
    def insert(self, chunks: List[str], embeddings: List[List[float]], metadata: List[Dict[str, Any]] = None) -> bool:
        points_list = []
        for index_id, (chunk, vector) in enumerate(zip(chunks, embeddings)):
            payload = {"document_text": chunk}
            if metadata and index_id < len(metadata):
                payload.update(metadata[index_id])
                
            node = models.PointStruct(
                id=index_id + 1, # Simplified ID logic for skeleton
                vector=vector,
                payload=payload
            )
            points_list.append(node)
            
        self.client.upload_points(
            collection_name="SeminarKnowledge_Base", 
            points=points_list
        )
        return True
        
    @time_profiler
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        results = self.client.search(
            collection_name="SeminarKnowledge_Base", 
            query_vector=query_embedding, 
            limit=top_k
        )
        return [hit.payload["document_text"] for hit in results]
