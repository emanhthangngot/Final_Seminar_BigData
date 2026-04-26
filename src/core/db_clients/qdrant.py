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


COLLECTION_NAME = "SeminarKnowledge_Base"


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
                # ========== FAIRNESS PROTOCOL ==========
                # Truyền tham số HNSW từ config chung, KHÔNG hardcode
                hnsw_config=models.HnswConfigDiff(
                    m=INDEX_PARAMS["M"],                          # 16
                    ef_construct=INDEX_PARAMS["ef_construction"], # 128
                ),
            )
            logger.info(f"[Qdrant] Collection '{self.collection_name}' created "
                        f"with HNSW M={INDEX_PARAMS['M']}, ef_construct={INDEX_PARAMS['ef_construction']}.")
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

        self.client.upload_points(collection_name=self.collection_name, points=points, wait=True)
        logger.info(f"[Qdrant] Inserted {len(points)} points in a single payload.")
        return True

    @time_profiler
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        results = self.client.query_points(
            collection_name=self.collection_name,
            query=query_embedding,
            limit=top_k,
            # Fairness: dùng cùng ef_search với Weaviate & Milvus
            search_params=models.SearchParams(
                hnsw_ef=INDEX_PARAMS["ef_search"],  # 64
            ),
        )
        return [hit.payload.get("document_text", "") for hit in results.points]

    @time_profiler
    def search_hybrid(
        self,
        query_text: str,
        query_embedding: List[float],
        filters: Dict[str, Any] = None,
        top_k: int = 5,
    ) -> List[str]:
        query_filter = None
        if filters:
            must_conditions = []
            for key, value in filters.items():
                if isinstance(value, dict):
                    range_kwargs = {}
                    for op in ("gte", "lte", "gt", "lt"):
                        if op in value:
                            range_kwargs[op] = value[op]
                    must_conditions.append(
                        models.FieldCondition(key=key, range=models.Range(**range_kwargs))
                    )
                elif isinstance(value, bool):
                    must_conditions.append(
                        models.FieldCondition(key=key, match=models.MatchValue(value=value))
                    )
                else:
                    must_conditions.append(
                        models.FieldCondition(key=key, match=models.MatchValue(value=value))
                    )
            query_filter = models.Filter(must=must_conditions)

        results = self.client.query_points(
            collection_name=self.collection_name,
            query=query_embedding,
            query_filter=query_filter,
            limit=top_k,
            search_params=models.SearchParams(hnsw_ef=INDEX_PARAMS["ef_search"]),
        )
        return [p.payload.get("document_text", "") for p in results.points]

    def reset_collection(self) -> None:
        try:
            self.client.delete_collection(self.collection_name)
            logger.info(f"[Qdrant] Collection '{self.collection_name}' dropped.")
        except Exception as exc:
            logger.warning(f"[Qdrant] Drop failed (may not exist): {exc}")
        self.connect()
