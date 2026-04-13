from typing import List, Dict, Any
import weaviate
from weaviate.classes.init import Auth
from src.core.db_clients.base import BaseVectorDB
from src.config import WEAVIATE_HOST, WEAVIATE_PORT, VECTOR_DIM
from src.core.benchmark.profiler import time_profiler
from src.core.utils.logger import logger

class WeaviateWrapper(BaseVectorDB):
    def connect(self) -> None:
        self.client = weaviate.connect_to_local(
            host=WEAVIATE_HOST,
            port=WEAVIATE_PORT
        )
        
        collection_name = "RAGDocument"
        # Check if collection exists
        if not self.client.collections.exists(collection_name):
            self.client.collections.create(
                name=collection_name,
                vectorizer_config=None # We provide our own vectors
            )
            logger.info(f"[Weaviate] Collection '{collection_name}' created.")
        else:
            logger.info(f"[Weaviate] Collection '{collection_name}' exists.")

    @time_profiler
    def insert(self, chunks: List[str], embeddings: List[List[float]], metadata: List[Dict[str, Any]] = None) -> bool:
        collection = self.client.collections.get("RAGDocument")
        with collection.batch.dynamic() as batch:
            for i, (chunk, vector) in enumerate(zip(chunks, embeddings)):
                properties = {"content": chunk}
                if metadata and i < len(metadata):
                    properties.update(metadata[i])
                batch.add_object(
                    properties=properties,
                    vector=vector
                )
        return True

    @time_profiler
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        collection = self.client.collections.get("RAGDocument")
        response = collection.query.near_vector(
            near_vector=query_embedding,
            limit=top_k
        )
        return [obj.properties["content"] for obj in response.objects]
