from typing import List, Dict, Any
from .base_client import BaseVectorDB
import weaviate
import weaviate.classes.config as wvc

class WeaviateWrapper(BaseVectorDB):
    def connect(self) -> None:
        # Establish connection using the v4 syntax framework (Golang base)
        self.client = weaviate.connect_to_local()
        
        # Hardcoded Schema Collection Creation (Avoid overriding if it already exists)
        if not self.client.collections.exists("SeminarDocChunk"):
            self.client.collections.create(
                name="SeminarDocChunk",
                vectorizer_config=wvc.config.Configure.Vectorizer.none(),  # Turn off auto-embedded features, we inject manually from Langchain
                properties=[
                    wvc.config.Property(name="document_text", data_type=wvc.config.DataType.TEXT)
                ]
            )
        print("[Weaviate] Connected and class architecture checked via gRPC fast-lane.")
            
    def insert(self, chunks: List[str], embeddings: List[List[float]], metadata: List[Dict[str, Any]] = None) -> bool:
        collection = self.client.collections.get("SeminarDocChunk")
        
        # Weaviate's Dynamic Batching intrinsically handles GC limits and prevents RAM overflow 
        # by sending highly optimized tiny gRPC concurrent packets underneath.
        with collection.batch.dynamic() as batch:
            for i, text_val in enumerate(chunks):
                batch.add_object(
                    properties={"document_text": text_val}, # Attach payload Text Properties
                    vector=embeddings[i]  # Manually bind raw Vector inputs (BYOV approach)
                )
        return True
        
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        collection = self.client.collections.get("SeminarDocChunk")
        
        # Deploy immediate gRPC NearVector metric query
        result = collection.query.near_vector(
            near_vector=query_embedding,
            limit=top_k
        )
        
        # Unwrap returning graph nodes; pick raw 'document_text' fields out
        return [obj.properties["document_text"] for obj in result.objects]
