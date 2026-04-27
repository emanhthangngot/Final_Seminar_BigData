"""
Weaviate Vector Database Wrapper.

Owner: Person B — Nguyễn Hồ Anh Tuấn (Weaviate Specialist).

This file is a STARTER TEMPLATE. The basic `connect`, `insert`, `search`
methods are wired so the RAG app can run end-to-end. Person B is expected to
complete `search_hybrid` and `reset_collection`, and to tune vectorizer /
module config for benchmarking.
"""

import atexit
from typing import List, Dict, Any

import weaviate
from weaviate.classes.config import Configure, DataType, Property

from src.core.db_clients.base import BaseVectorDB
from src.config import (
    WEAVIATE_HOST,
    WEAVIATE_PORT,
    WEAVIATE_GRPC_PORT,
    INDEX_PARAMS,  # <-- canonical HNSW params shared with Qdrant & Milvus
)
from src.core.benchmark.profiler import time_profiler
from src.core.utils.logger import logger


COLLECTION_NAME = "RAGDocument"
SCHEMA_PROPERTIES = [
    Property(name="content", data_type=DataType.TEXT),
    Property(name="source", data_type=DataType.TEXT),
    Property(name="chunk_id", data_type=DataType.TEXT),
]


# [TODO — Person B] Pass INDEX_PARAMS["M"] / ef_construction into
# `vector_index_config=Configure.VectorIndex.hnsw(...)` at collection creation
# time so Weaviate uses the same HNSW settings as the other two DBs.


class WeaviateWrapper(BaseVectorDB):
    def __init__(self) -> None:
        self.client = None
        self.collection_name = COLLECTION_NAME
        self._atexit_registered = False

    def connect(self) -> None:
        if self.client is not None:
            self.close()

        self.client = weaviate.connect_to_local(
            host=WEAVIATE_HOST,
            port=WEAVIATE_PORT,
            grpc_port=WEAVIATE_GRPC_PORT,
        )

        if not self.client.is_ready():
            raise ConnectionError(
                f"[Weaviate] Endpoint {WEAVIATE_HOST}:{WEAVIATE_PORT} is not ready."
            )

        self.collection_name = COLLECTION_NAME

        if not self._atexit_registered:
            atexit.register(self.close)
            self._atexit_registered = True

        if not self.client.collections.exists(self.collection_name):
            self.client.collections.create(
                name=self.collection_name,
                properties=SCHEMA_PROPERTIES,
                vectorizer_config=Configure.Vectorizer.none(),
            )
            logger.info(f"[Weaviate] Collection '{self.collection_name}' created.")
        else:
            logger.info(f"[Weaviate] Collection '{self.collection_name}' exists.")

    @time_profiler
    def insert(
        self,
        chunks: List[str],
        embeddings: List[List[float]],
        metadata: List[Dict[str, Any]] = None,
    ) -> bool:
        collection = self.client.collections.get(self.collection_name)
        with collection.batch.dynamic() as batch:
            for i, (chunk, vector) in enumerate(zip(chunks, embeddings)):
                properties: Dict[str, Any] = {"content": chunk}
                if metadata and i < len(metadata):
                    properties.update(metadata[i])
                batch.add_object(properties=properties, vector=vector)
        return True

    @time_profiler
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        collection = self.client.collections.get(self.collection_name)
        response = collection.query.near_vector(
            near_vector=query_embedding,
            limit=top_k,
        )
        return [obj.properties["content"] for obj in response.objects]

    @time_profiler
    def search_hybrid(
        self,
        query_text: str,
        query_embedding: List[float],
        filters: Dict[str, Any] = None,
        top_k: int = 5,
    ) -> List[str]:
        """
        [TODO — Person B / Weaviate Specialist]

        Goals:
          1. Build a filter with `weaviate.classes.query.Filter` from `filters`.
          2. Run `collection.query.hybrid(query=query_text, vector=query_embedding, filters=...)`.
          3. Return list of `content` strings from the response.

        Starter hint:
            from weaviate.classes.query import Filter
            collection = self.client.collections.get(self.collection_name)
            flt = None
            if filters:
                flt = Filter.all_of([Filter.by_property(k).equal(v) for k, v in filters.items()])
            response = collection.query.hybrid(
                query=query_text,
                vector=query_embedding,
                limit=top_k,
                filters=flt,
            )
            return [obj.properties["content"] for obj in response.objects]
        """
        raise NotImplementedError(
            "[Weaviate] Hybrid Search & Filters not implemented yet — Person B."
        )

    def close(self) -> None:
        if self.client is None:
            return
        try:
            self.client.close()
        except Exception as exc:
            logger.warning(f"[Weaviate] Close warning: {exc}")
        finally:
            self.client = None

    def reset_collection(self) -> None:
        """
        [TODO — Person B]
        Drop and recreate the Weaviate collection.

        Starter hint:
            self.client.collections.delete(self.collection_name)
            self.connect()
        """
        raise NotImplementedError("[Weaviate] reset_collection not implemented yet — Person B.")
