from typing import List, Dict, Any
from pymilvus import connections, Collection, FieldSchema, CollectionSchema, DataType, utility
from src.db_clients.base import BaseVectorDB
from src.config import MILVUS_HOST, MILVUS_PORT, VECTOR_DIM
from src.benchmark.profiler import time_profiler
from src.utils.logger import logger
from src.utils.helpers import format_milvus_collection_name

class MilvusWrapper(BaseVectorDB):
    def connect(self) -> None:
        connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
        collection_name = format_milvus_collection_name("Seminar_RAG_Collection")
        
        if not utility.has_collection(collection_name):
            fields = [
                FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
                FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=65535),
                FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=VECTOR_DIM)
            ]
            schema = CollectionSchema(fields, "Scalar and Vector database for RAG")
            self.collection = Collection(collection_name, schema)
            
            # Create HNSW index
            index_params = {
                "metric_type": "COSINE",
                "index_type": "HNSW",
                "params": {"M": 16, "efConstruction": 64}
            }
            self.collection.create_index("vector", index_params)
            logger.info(f"[Milvus] Collection '{collection_name}' and HNSW index created.")
        else:
            self.collection = Collection(collection_name)
            logger.info(f"[Milvus] Collection '{collection_name}' already exists.")
        
        # Load collection into memory
        self.collection.load()

    @time_profiler
    def insert(self, chunks: List[str], embeddings: List[List[float]], metadata: List[Dict[str, Any]] = None) -> bool:
        data = [
            chunks,
            embeddings
        ]
        self.collection.insert(data)
        self.collection.flush()
        return True

    @time_profiler
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        search_params = {"metric_type": "COSINE", "params": {"ef": 64}}
        results = self.collection.search(
            data=[query_embedding],
            anns_field="vector",
            param=search_params,
            limit=top_k,
            output_fields=["content"]
        )
        
        return [hit.entity.get("content") for hit in results[0]]
