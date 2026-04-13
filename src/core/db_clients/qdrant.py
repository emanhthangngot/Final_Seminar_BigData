"""
Qdrant Vector Database Wrapper.

Owner: Person D — Trần Lê Trung Trực (Qdrant Specialist).

This file is a STARTER TEMPLATE. The basic `connect`, `insert`, and `search`
methods are wired so the RAG app can run end-to-end. The Qdrant specialist is
expected to complete `search_hybrid` and `reset_collection`, and to tune the
index / quantization settings for benchmarking.
"""

from typing import List, Dict, Any

from qdrant_client import QdrantClient
from qdrant_client.http import models

from src.core.db_clients.base import BaseVectorDB
from src.config import (
    QDRANT_HOST,
    QDRANT_HTTP_PORT,
    VECTOR_DIM,
    INDEX_PARAMS,  # <-- canonical HNSW params shared with Weaviate & Milvus
)
from src.core.benchmark.profiler import time_profiler
from src.core.utils.logger import logger


COLLECTION_NAME = "SeminarKnowledgeBase"


# [TODO — Person D] When creating the collection, pass INDEX_PARAMS["M"] and
# INDEX_PARAMS["ef_construction"] into `hnsw_config=models.HnswConfigDiff(...)`
# so Qdrant benchmarks on the SAME HNSW settings as Weaviate & Milvus.


class QdrantWrapper(BaseVectorDB):
    def connect(self) -> None:
        self.client = QdrantClient(host=QDRANT_HOST, port=QDRANT_HTTP_PORT)
        self.collection_name = COLLECTION_NAME

        existing = {c.name for c in self.client.get_collections().collections}
        if self.collection_name not in existing:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(
                    size=VECTOR_DIM,
                    distance=models.Distance.COSINE,
                ),
            )
            logger.info(f"[Qdrant] Collection '{self.collection_name}' created.")
        else:
            logger.info(f"[Qdrant] Collection '{self.collection_name}' already exists.")
            
    @time_profiler
    def insert(
        self,
        chunks: List[str],
        embeddings: List[List[float]],
        metadata: List[Dict[str, Any]] = None,
    ) -> bool:
        import uuid

        points: List[models.PointStruct] = []
        for i, (chunk, vector) in enumerate(zip(chunks, embeddings)):
            payload: Dict[str, Any] = {"document_text": chunk}
            if metadata and i < len(metadata):
                payload.update(metadata[i])
            points.append(
                models.PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload=payload,
                )
            )

        self.client.upload_points(collection_name=self.collection_name, points=points)
        return True

    @time_profiler
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_embedding,
            limit=top_k,
        )
        return [hit.payload.get("document_text", "") for hit in results]

    @time_profiler
    def search_hybrid(
        self,
        query_text: str,
        query_embedding: List[float],
        filters: Dict[str, Any] = None,
        top_k: int = 5,
    ) -> List[str]:
        """
        [TODO — Person D / Qdrant Specialist]

        Goals:
          1. Build a `models.Filter` from the `filters` dict (support eq / range / bool).
          2. Call `self.client.query_points(...)` with `query_filter=...`.
          3. (Stretch) Integrate BM25 sparse vectors via `prefetch` for true hybrid.

        Starter hint:
            flt = models.Filter(must=[models.FieldCondition(
                key=k, match=models.MatchValue(value=v)) for k, v in (filters or {}).items()])
            res = self.client.query_points(
                collection_name=self.collection_name,
                query=query_embedding,
                query_filter=flt,
                limit=top_k,
            )
            return [p.payload["document_text"] for p in res.points]
        """
        raise NotImplementedError(
            "[Qdrant] Hybrid Search & Filters not implemented yet — Person D."
        )

    def reset_collection(self) -> None:
        """
        [TODO — Person D]
        Drop and recreate `self.collection_name` for a clean benchmark.

        Starter hint:
            self.client.delete_collection(self.collection_name)
            self.connect()
        """
        raise NotImplementedError("[Qdrant] reset_collection not implemented yet — Person D.")
