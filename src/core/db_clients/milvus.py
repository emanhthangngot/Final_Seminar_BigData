"""
Milvus Vector Database Wrapper.

Owner: Person C — Trần Hữu Kim Thành (Milvus Specialist).

This file is a STARTER TEMPLATE. The basic `connect`, `insert`, `search`
methods are wired so the RAG app can run end-to-end. Person C is expected to
complete `search_hybrid` and `reset_collection`, and to tune index params
(IVF_FLAT / HNSW / IVF_PQ) for benchmarking.
"""

from typing import List, Dict, Any

from pymilvus import (
    connections,
    Collection,
    CollectionSchema,
    FieldSchema,
    DataType,
    utility,
)

from src.core.db_clients.base import BaseVectorDB
from src.config import (
    MILVUS_HOST,
    MILVUS_PORT,
    VECTOR_DIM,
    INDEX_PARAMS,  # <-- canonical HNSW params shared with Qdrant & Weaviate
)
from src.core.benchmark.profiler import time_profiler
from src.core.utils.logger import logger
from src.core.utils.helpers import format_milvus_collection_name


COLLECTION_NAME = format_milvus_collection_name("Seminar_RAG_Collection")


# [TODO — Person C] Use INDEX_PARAMS["M"] / ef_construction / ef_search in the
# HNSW index_params and search_params dicts so Milvus is calibrated identically
# to Qdrant & Weaviate. Otherwise the benchmark is not apples-to-apples.


class MilvusWrapper(BaseVectorDB):
    def connect(self) -> None:
        connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
        self.collection_name = COLLECTION_NAME

        if not utility.has_collection(self.collection_name):
            fields = [
                FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
                FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=65535),
                FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=VECTOR_DIM),
            ]
            schema = CollectionSchema(fields, description="Seminar RAG benchmark collection")
            self.collection = Collection(self.collection_name, schema)
            self.collection.create_index(
                "vector",
                {
                    "metric_type": "COSINE",
                    "index_type": "HNSW",
                    "params": {"M": 16, "efConstruction": 64},
                },
            )
            logger.info(f"[Milvus] Collection '{self.collection_name}' and HNSW index created.")
        else:
            self.collection = Collection(self.collection_name)
            logger.info(f"[Milvus] Collection '{self.collection_name}' already exists.")

        self.collection.load()

    @time_profiler
    def insert(
        self,
        chunks: List[str],
        embeddings: List[List[float]],
        metadata: List[Dict[str, Any]] = None,
    ) -> bool:
        self.collection.insert([chunks, embeddings])
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
            output_fields=["content"],
        )
        return [hit.entity.get("content") for hit in results[0]]

    @time_profiler
    def search_hybrid(
        self,
        query_text: str,
        query_embedding: List[float],
        filters: Dict[str, Any] = None,
        top_k: int = 5,
    ) -> List[str]:
        """
        [TODO — Person C / Milvus Specialist]

        Goals:
          1. Translate `filters` dict into a Milvus boolean expression string
             (e.g. `category == "tech" and year > 2023`).
          2. Pass it as the `expr` argument to `self.collection.search(...)`.
          3. (Stretch) Use `AnnSearchRequest` + `RRFRanker` for true hybrid search
             combining dense and sparse vectors.

        Starter hint:
            expr_parts = []
            for k, v in (filters or {}).items():
                expr_parts.append(f'{k} == "{v}"' if isinstance(v, str) else f'{k} == {v}')
            expr = " and ".join(expr_parts) if expr_parts else None
            results = self.collection.search(
                data=[query_embedding],
                anns_field="vector",
                param={"metric_type": "COSINE", "params": {"ef": 64}},
                limit=top_k,
                expr=expr,
                output_fields=["content"],
            )
            return [hit.entity.get("content") for hit in results[0]]
        """
        raise NotImplementedError(
            "[Milvus] Hybrid Search & Filters not implemented yet — Person C."
        )

    def reset_collection(self) -> None:
        """
        [TODO — Person C]
        Drop and recreate the Milvus collection.

        Starter hint:
            utility.drop_collection(self.collection_name)
            self.connect()
        """
        raise NotImplementedError("[Milvus] reset_collection not implemented yet — Person C.")
