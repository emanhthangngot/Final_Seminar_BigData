from typing import List, Dict, Any
from .base_client import BaseVectorDB
from pymilvus import CollectionSchema, FieldSchema, DataType, Collection, connections, utility

class MilvusWrapper(BaseVectorDB):
    def connect(self) -> None:
        # Initial connection points towards the Docker Container Coordinator (Proxy Node)
        connections.connect(alias="default", host="localhost", port="19530")
        
        # Hardcoded Component Schema Design (Milvus strictly mandates predefined variables!)
        if not utility.has_collection("SeminarKnowledge_DB"):
            id_field = FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True)
            txt_field = FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=65000) # Strict boundary text column container
            vec_field = FieldSchema(name="vec", dtype=DataType.FLOAT_VECTOR, dim=1536) # Explicit Dimension boundary vector container
            
            schema = CollectionSchema([id_field, txt_field, vec_field])
            self.collection = Collection("SeminarKnowledge_DB", schema)
        else:
            self.collection = Collection("SeminarKnowledge_DB")
        print("[Milvus] Proxy node connected and segment schema validated.")
        
    def insert(self, chunks: List[str], embeddings: List[List[float]], metadata: List[Dict[str, Any]] = None) -> bool:
        # Structuring data formatting: The array needs to be Transposed 
        # as a 'List of Columns' rather than a 'List of Rows' elements.
        insert_data_columns = [
            chunks,         # Inject the VARCHAR Column batch
            embeddings      # Inject the FLOAT VECTOR Column batch
        ]
        self.collection.insert(insert_data_columns)
        
        # Mandatory call: Explicitly orders the system cache buffer downwards to MinIO disk components
        self.collection.flush() 
        return True
        
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        # Formulate HNSW Search structure parameter bindings
        idx_params = {
            "metric_type": "COSINE",
            "index_type": "HNSW", 
            "params": {"M": 16, "efConstruction": 64}
        }
        self.collection.create_index(field_name="vec", index_params=idx_params)
        
        # **Crucial Call**: Must pump constructed mathematical Index graphs directly upward into Runtime RAM memory!
        self.collection.load() 
        
        # Trigger query search. We must deliberately set 'output_fields' to return any hidden properties since native nodes do not include payload metadata by default
        result = self.collection.search(
            data=[query_embedding], 
            anns_field="vec", 
            param={"metric_type": "COSINE", "params": {"ef": 64}}, 
            limit=top_k, 
            output_fields=["text"] 
        )
        
        # Flatten and unwrap the multi-dimensional List of Hit Object fragments from C++ response
        return [hit.entity.get('text') for hits in result for hit in hits]
