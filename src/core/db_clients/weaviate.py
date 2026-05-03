"""
Weaviate Vector Database Wrapper.

Owner: Person B - Nguyen Ho Anh Tuan (Weaviate Specialist).

Implements the BaseVectorDB interface for Weaviate Standalone.
All HNSW parameters are sourced from ``src.config.INDEX_PARAMS`` to satisfy
the Fairness Protocol used by Qdrant, Weaviate, and Milvus.

Capabilities:
  - connect()         : create collection with canonical HNSW index
  - insert()          : dynamic batch insert, profiled via @time_profiler
  - search()          : dense vector search
  - search_hybrid()   : BM25 + dense vector hybrid search with metadata filters
  - reset_collection(): drop + recreate for clean benchmark runs
"""

import atexit
from typing import Any, Dict, List, Optional

import weaviate
from weaviate.classes.config import Configure, DataType, Property
from weaviate.classes.query import Filter

from src.config import (
    INDEX_PARAMS,  # canonical HNSW params shared with Qdrant and Milvus
    VECTOR_DIM,
    WEAVIATE_GRPC_PORT,
    WEAVIATE_HOST,
    WEAVIATE_PORT,
)
from src.core.benchmark.profiler import time_profiler
from src.core.db_clients.base import BaseVectorDB
from src.core.utils.logger import logger


COLLECTION_NAME = "RAGDocument"
SCHEMA_PROPERTIES = [
    Property(name="content", data_type=DataType.TEXT),
    Property(name="source", data_type=DataType.TEXT),
    Property(name="chunk_id", data_type=DataType.TEXT),
    Property(name="category", data_type=DataType.TEXT),
    Property(name="page", data_type=DataType.INT),
]
SCHEMA_PROPERTY_NAMES = {prop.name for prop in SCHEMA_PROPERTIES}
HYBRID_ALPHA = 0.5


class WeaviateWrapper(BaseVectorDB):
    """
    Weaviate wrapper implementing the shared BaseVectorDB contract.

    All benchmark-sensitive index knobs read from ``INDEX_PARAMS``.
    """

    def __init__(self) -> None:
        self.client = None
        self.collection_name = COLLECTION_NAME
        self._atexit_registered = False

    # ------------------------------------------------------------------
    # Connection & Collection Management
    # ------------------------------------------------------------------
    def connect(self) -> None:
        """
        Connect to Weaviate and ensure the benchmark collection exists.

        FAIRNESS PROTOCOL: HNSW M, efConstruction, and ef search are all
        sourced from ``INDEX_PARAMS``. Do not hardcode benchmark-sensitive
        values in this wrapper.
        """
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
            self._create_collection()
        else:
            logger.info("[Weaviate] Collection '%s' exists.", self.collection_name)

    def _create_collection(self) -> None:
        self.client.collections.create(
            name=self.collection_name,
            properties=SCHEMA_PROPERTIES,
            vectorizer_config=Configure.Vectorizer.none(),
            vector_index_config=Configure.VectorIndex.hnsw(
                max_connections=INDEX_PARAMS["M"],
                ef_construction=INDEX_PARAMS["ef_construction"],
                ef=INDEX_PARAMS["ef_search"],
            ),
        )
        logger.info(
            "[Weaviate] Collection '%s' created with HNSW "
            "(M=%d, efConstruction=%d, ef=%d).",
            self.collection_name,
            INDEX_PARAMS["M"],
            INDEX_PARAMS["ef_construction"],
            INDEX_PARAMS["ef_search"],
        )

    # ------------------------------------------------------------------
    # Insert
    # ------------------------------------------------------------------
    @time_profiler
    def insert(
        self,
        chunks: List[str],
        embeddings: List[List[float]],
        metadata: List[Dict[str, Any]] = None,
    ) -> bool:
        """
        Batch insert chunks and vectors via ``collection.batch.dynamic()``.

        Only schema-backed metadata fields are sent to Weaviate so benchmark
        ingestion stays stable when upstream callers include extra keys.
        """
        if not chunks:
            logger.warning("[Weaviate] insert() called with empty chunks list.")
            return False
        if len(chunks) != len(embeddings):
            raise ValueError(
                f"[Weaviate] chunks length ({len(chunks)}) must match "
                f"embeddings length ({len(embeddings)})."
            )

        collection = self.client.collections.get(self.collection_name)
        with collection.batch.dynamic() as batch:
            for i, (chunk, vector) in enumerate(zip(chunks, embeddings)):
                if len(vector) != VECTOR_DIM:
                    raise ValueError(
                        f"[Weaviate] Embedding #{i} has dim={len(vector)}, "
                        f"expected {VECTOR_DIM}."
                    )
                properties = self._build_properties(
                    content=chunk,
                    metadata=(metadata[i] if metadata and i < len(metadata) else None),
                )
                batch.add_object(properties=properties, vector=vector)

        logger.info("[Weaviate] Inserted %d chunks via dynamic batch.", len(chunks))
        return True

    def _build_properties(
        self,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        properties: Dict[str, Any] = {"content": content}
        if not metadata:
            return properties

        for key, value in metadata.items():
            if key not in SCHEMA_PROPERTY_NAMES or value is None:
                continue
            if key == "page":
                properties[key] = int(value)
            elif key != "content":
                properties[key] = str(value)
        return properties

    # ------------------------------------------------------------------
    # Dense Vector Search
    # ------------------------------------------------------------------
    @time_profiler
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        """Standard dense ANN search."""
        self._validate_query_embedding(query_embedding)

        collection = self.client.collections.get(self.collection_name)
        response = collection.query.near_vector(
            near_vector=query_embedding,
            limit=top_k,
        )
        return [obj.properties.get("content", "") for obj in response.objects]

    # ------------------------------------------------------------------
    # Hybrid Search (BM25 + Dense Vector + Metadata Filter)
    # ------------------------------------------------------------------
    @time_profiler
    def search_hybrid(
        self,
        query_text: str,
        query_embedding: List[float],
        filters: Dict[str, Any] = None,
        top_k: int = 5,
    ) -> List[str]:
        """
        Run Weaviate hybrid search with an optional metadata filter.

        Weaviate combines BM25 keyword scoring from ``query_text`` with the
        dense vector supplied by ``query_embedding``. ``HYBRID_ALPHA`` keeps
        the Week-2 default neutral: 0.0 = BM25 only, 1.0 = vector only.
        """
        self._validate_query_embedding(query_embedding)

        collection = self.client.collections.get(self.collection_name)
        response = collection.query.hybrid(
            query=query_text,
            vector=query_embedding,
            alpha=HYBRID_ALPHA,
            limit=top_k,
            filters=self._build_filter(filters),
        )
        return [obj.properties.get("content", "") for obj in response.objects]

    def _build_filter(self, filters: Optional[Dict[str, Any]] = None):
        if not filters:
            return None

        conditions = []
        for key, value in filters.items():
            if key not in SCHEMA_PROPERTY_NAMES or key == "content":
                logger.warning("[Weaviate] Ignoring unsupported filter key '%s'.", key)
                continue
            conditions.extend(self._conditions_for_filter(key, value))

        if not conditions:
            return None
        if len(conditions) == 1:
            return conditions[0]
        return Filter.all_of(conditions)

    def _conditions_for_filter(self, key: str, value: Any) -> list:
        prop = Filter.by_property(key)
        if isinstance(value, dict):
            conditions = []
            for operator, operand in value.items():
                condition = self._condition_from_operator(prop, operator, operand)
                if condition is not None:
                    conditions.append(condition)
            return conditions

        if isinstance(value, (list, tuple, set)):
            values = list(value)
            return [Filter.any_of([prop.equal(item) for item in values])] if values else []

        return [prop.equal(value)]

    def _condition_from_operator(self, prop, operator: str, operand: Any):
        normalized = operator.lower().lstrip("$")
        if normalized in ("eq", "equal"):
            return prop.equal(operand)
        if normalized in ("ne", "neq", "not_equal"):
            return prop.not_equal(operand)
        if normalized in ("gt", "greater_than"):
            return prop.greater_than(operand)
        if normalized in ("gte", "ge", "greater_or_equal"):
            return prop.greater_or_equal(operand)
        if normalized in ("lt", "less_than"):
            return prop.less_than(operand)
        if normalized in ("lte", "le", "less_or_equal"):
            return prop.less_or_equal(operand)
        if normalized in ("in", "any_of"):
            values = operand if isinstance(operand, (list, tuple, set)) else [operand]
            return Filter.any_of([prop.equal(item) for item in values])

        logger.warning("[Weaviate] Ignoring unsupported filter operator '%s'.", operator)
        return None

    def _validate_query_embedding(self, query_embedding: List[float]) -> None:
        if len(query_embedding) != VECTOR_DIM:
            raise ValueError(
                f"[Weaviate] Query embedding has dim={len(query_embedding)}, "
                f"expected {VECTOR_DIM}."
            )

    def close(self) -> None:
        if self.client is None:
            return
        try:
            self.client.close()
        except Exception as exc:
            logger.warning("[Weaviate] Close warning: %s", exc)
        finally:
            self.client = None

    # ------------------------------------------------------------------
    # Reset (for clean benchmark re-runs)
    # ------------------------------------------------------------------
    def reset_collection(self) -> None:
        """
        Drop the existing collection and recreate it with canonical HNSW
        params for a clean benchmark iteration.
        """
        if self.client is None:
            self.connect()

        if self.client.collections.exists(self.collection_name):
            self.client.collections.delete(self.collection_name)
            logger.info("[Weaviate] Collection '%s' dropped.", self.collection_name)

        self._create_collection()
        logger.info("[Weaviate] Collection '%s' recreated (clean state).", self.collection_name)
