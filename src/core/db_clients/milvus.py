"""
Milvus Vector Database Wrapper.

Owner: Person C — Trần Hữu Kim Thành (Milvus Specialist).

Implements the BaseVectorDB interface for Milvus Standalone.
All HNSW parameters are sourced from ``src.config.INDEX_PARAMS`` to satisfy
the Fairness Protocol — no benchmark-sensitive values are hardcoded.

Capabilities:
  - connect()        : create/load collection with canonical HNSW index
  - insert()         : batch insert + flush, profiled via @time_profiler
  - search()         : ANN search using INDEX_PARAMS for search_params
  - search_hybrid()  : dense vector search with boolean ``expr`` filter
  - reset_collection(): drop + recreate for clean benchmark runs
"""

import time
from typing import List, Dict, Any, Optional

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
    INDEX_PARAMS,  # <- canonical HNSW params shared with Qdrant & Weaviate
)
from src.core.benchmark.profiler import time_profiler, log_metrics
from src.core.utils.logger import logger
from src.core.utils.helpers import format_milvus_collection_name


COLLECTION_NAME = format_milvus_collection_name("Seminar_RAG_Collection")


def _get_process_ram_mb() -> float:
    """
    Return current process RSS memory in MB.
    Uses psutil if available; falls back to 0.0 so the rest of connect()
    always works even without the package installed.
    """
    try:
        import psutil, os
        return psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024)
    except Exception:
        return 0.0

# Batch size for large corpus ingestion — avoids timeout/OOM on 10K+ chunks
INSERT_BATCH_SIZE = 500
FILTER_FIELDS = {
    "source": "string",
    "category": "string",
    "page": "number",
}
FILTER_OPERATORS = {
    "eq": "==",
    "equal": "==",
    "ne": "!=",
    "neq": "!=",
    "not_equal": "!=",
    "gt": ">",
    "gte": ">=",
    "ge": ">=",
    "lt": "<",
    "lte": "<=",
    "le": "<=",
}


class MilvusWrapper(BaseVectorDB):
    """
    Milvus Standalone wrapper implementing the BaseVectorDB contract.

    All index tuning knobs read from ``INDEX_PARAMS`` (Fairness Protocol).
    """

    def __init__(self):
        self.collection: Optional[Collection] = None
        self.collection_name: str = COLLECTION_NAME

    # ------------------------------------------------------------------
    # Connection & Collection Management
    # ------------------------------------------------------------------
    def connect(self) -> None:
        """
        Connect to Milvus and ensure the benchmark collection exists with
        the canonical HNSW index configuration.

        FAIRNESS PROTOCOL: M, efConstruction, metric_type are all sourced
        from ``INDEX_PARAMS`` — never hardcoded.
        """
        connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)

        if not utility.has_collection(self.collection_name):
            fields = [
                FieldSchema(
                    name="id",
                    dtype=DataType.INT64,
                    is_primary=True,
                    auto_id=True,
                ),
                FieldSchema(
                    name="content",
                    dtype=DataType.VARCHAR,
                    max_length=65535,
                ),
                FieldSchema(
                    name="vector",
                    dtype=DataType.FLOAT_VECTOR,
                    dim=VECTOR_DIM,
                ),
                # --- Metadata fields for search_hybrid() expr filters ---
                FieldSchema(
                    name="source",
                    dtype=DataType.VARCHAR,
                    max_length=1024,
                    default_value="",
                ),
                FieldSchema(
                    name="category",
                    dtype=DataType.VARCHAR,
                    max_length=256,
                    default_value="",
                ),
                FieldSchema(
                    name="page",
                    dtype=DataType.INT64,
                    default_value=0,
                ),
            ]
            schema = CollectionSchema(
                fields,
                description="Seminar RAG benchmark collection (Milvus)",
            )
            self.collection = Collection(self.collection_name, schema)

            # ----- HNSW Index — params from canonical INDEX_PARAMS -----
            index_params = {
                "metric_type": INDEX_PARAMS["metric"],
                "index_type": INDEX_PARAMS["index_type"],
                "params": {
                    "M": INDEX_PARAMS["M"],
                    "efConstruction": INDEX_PARAMS["ef_construction"],
                },
            }
            self.collection.create_index("vector", index_params)

            logger.info(
                "[Milvus] Collection '%s' created with HNSW index "
                "(M=%d, efConstruction=%d, metric=%s).",
                self.collection_name,
                INDEX_PARAMS["M"],
                INDEX_PARAMS["ef_construction"],
                INDEX_PARAMS["metric"],
            )
        else:
            self.collection = Collection(self.collection_name)
            logger.info(
                "[Milvus] Collection '%s' already exists — reusing.",
                self.collection_name,
            )

        # ── Load collection into memory with timing + RAM spike monitoring ──
        _ram_before = _get_process_ram_mb()
        _t_load = time.perf_counter()
        self.collection.load()
        _load_ms = (time.perf_counter() - _t_load) * 1000
        _ram_after = _get_process_ram_mb()

        # Log load timing to metrics.csv
        log_metrics("Milvus", "load", _load_ms)

        _ram_delta = _ram_after - _ram_before
        logger.info(
            "[Milvus] collection.load() took %.2f ms | "
            "RAM before=%.1f MB, after=%.1f MB, spike=+%.1f MB",
            _load_ms, _ram_before, _ram_after, max(_ram_delta, 0.0),
        )
        logger.info("[Milvus] Collection loaded into memory — ready for queries.")

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
        Batch insert chunks + embeddings into Milvus and flush to persist.

        For large corpora (10K+), data is automatically split into batches
        of ``INSERT_BATCH_SIZE`` to avoid timeout and memory spikes.

        Parameters
        ----------
        chunks : list[str]
            Text content of each chunk.
        embeddings : list[list[float]]
            Corresponding vector embeddings (dim must equal VECTOR_DIM).
        metadata : list[dict], optional
            Per-chunk metadata. Recognised keys: ``source``, ``category``, ``page``.
        """
        if not chunks:
            logger.warning("[Milvus] insert() called with empty chunks list.")
            return False
        if len(chunks) != len(embeddings):
            raise ValueError(
                f"[Milvus] chunks length ({len(chunks)}) must match "
                f"embeddings length ({len(embeddings)})."
            )

        for i, emb in enumerate(embeddings):
            if len(emb) != VECTOR_DIM:
                raise ValueError(
                    f"[Milvus] Embedding #{i} has dim={len(emb)}, expected {VECTOR_DIM}"
                )

        # Build per-row metadata lists
        sources = []
        categories = []
        pages = []
        for i in range(len(chunks)):
            meta = (metadata[i] if metadata and i < len(metadata) else {}) or {}
            sources.append(str(meta.get("source", "")))
            categories.append(str(meta.get("category", "")))
            pages.append(self._coerce_page(meta.get("page", 0), field_name="page"))

        # --- Batch insert for 10K+ corpus stability ---
        total = len(chunks)
        inserted = 0
        for start in range(0, total, INSERT_BATCH_SIZE):
            end = min(start + INSERT_BATCH_SIZE, total)
            batch_data = [
                chunks[start:end],
                embeddings[start:end],
                sources[start:end],
                categories[start:end],
                pages[start:end],
            ]
            self.collection.insert(batch_data)
            inserted += (end - start)
            if total > INSERT_BATCH_SIZE:
                logger.info(
                    "[Milvus] Batch inserted %d/%d chunks.", inserted, total
                )

        _t_flush_start = time.perf_counter()
        self.collection.flush()
        _flush_ms = (time.perf_counter() - _t_flush_start) * 1000
        log_metrics("Milvus", "flush", _flush_ms)
        logger.info("[Milvus] Inserted %d chunks total and flushed (%.2f ms).", total, _flush_ms)
        return True

    # ------------------------------------------------------------------
    # Dense Vector Search (ANN)
    # ------------------------------------------------------------------
    @time_profiler
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        """
        Standard ANN search using the canonical search params from INDEX_PARAMS.
        """
        search_params = {
            "metric_type": INDEX_PARAMS["metric"],
            "params": {
                "ef": INDEX_PARAMS["ef_search"],
            },
        }
        results = self.collection.search(
            data=[query_embedding],
            anns_field="vector",
            param=search_params,
            limit=top_k,
            output_fields=["content"],
        )
        return [hit.entity.get("content") for hit in results[0]]

    # ------------------------------------------------------------------
    # Hybrid Search (Dense + Boolean Expr Filter + RRF Reranking)
    # ------------------------------------------------------------------

    @classmethod
    def _build_expr(cls, filters: Dict[str, Any]) -> Optional[str]:
        """
        Translate a ``filters`` dict into a Milvus boolean expression string.

        Examples:
            {"category": "tech"}             -> 'category == "tech"'
            {"page": {"gte": 3, "lte": 10}}  -> 'page >= 3 and page <= 10'
            {"category": {"in": ["a", "b"]}} -> 'category in ["a", "b"]'
        """
        if not filters:
            return None

        parts = []
        for key, value in filters.items():
            if key not in FILTER_FIELDS:
                raise ValueError(f"[Milvus] Unsupported filter field: {key}")
            parts.extend(cls._conditions_for_filter(key, value))

        return " and ".join(parts) if parts else None

    @classmethod
    def _conditions_for_filter(cls, key: str, value: Any) -> List[str]:
        if isinstance(value, dict):
            conditions = []
            for operator, operand in value.items():
                normalized_operator = str(operator).lower().lstrip("$")
                if normalized_operator in ("in", "any_of"):
                    conditions.append(cls._format_in_condition(key, operand))
                    continue
                if normalized_operator not in FILTER_OPERATORS:
                    raise ValueError(
                        f"[Milvus] Unsupported filter operator for '{key}': {operator}"
                    )
                conditions.append(
                    f"{key} {FILTER_OPERATORS[normalized_operator]} "
                    f"{cls._format_filter_value(key, operand)}"
                )
            return conditions

        if isinstance(value, (list, tuple, set)):
            return [cls._format_in_condition(key, value)]

        return [f"{key} == {cls._format_filter_value(key, value)}"]

    @classmethod
    def _format_in_condition(cls, key: str, values: Any) -> str:
        if isinstance(values, (str, bytes)) or not isinstance(values, (list, tuple, set)):
            values = [values]
        values = list(values)
        if not values:
            raise ValueError(f"[Milvus] Empty IN filter for '{key}' is not allowed.")
        formatted = ", ".join(cls._format_filter_value(key, value) for value in values)
        return f"{key} in [{formatted}]"

    @classmethod
    def _format_filter_value(cls, key: str, value: Any) -> str:
        field_type = FILTER_FIELDS[key]
        if field_type == "number":
            return str(cls._coerce_page(value, field_name=key))
        if value is None:
            raise ValueError(f"[Milvus] None is not a valid filter value for '{key}'.")
        safe = str(value).replace("\\", "\\\\").replace('"', '\\"')
        return f'"{safe}"'

    @staticmethod
    def _coerce_page(value: Any, field_name: str) -> int:
        if isinstance(value, bool):
            raise ValueError(f"[Milvus] Boolean value is not valid for '{field_name}'.")
        try:
            return int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"[Milvus] Filter/metadata field '{field_name}' must be an integer."
            ) from exc

    @time_profiler
    def search_hybrid(
        self,
        query_text: str,
        query_embedding: List[float],
        filters: Dict[str, Any] = None,
        top_k: int = 5,
    ) -> List[str]:
        """
        Hybrid search combining dense vector ANN with boolean ``expr`` filtering.

        Attempts to use ``AnnSearchRequest`` + ``RRFRanker`` for true hybrid
        reranking (PyMilvus >= 2.4). Falls back to basic ``collection.search()``
        with ``expr`` on older versions.

        Parameters
        ----------
        query_text : str
            Original query string (reserved for future sparse/BM25 integration).
        query_embedding : list[float]
            Dense query vector.
        filters : dict, optional
            Key-value pairs to AND-combine into a boolean expression.
        top_k : int
            Number of results to return.
        """
        expr = self._build_expr(filters)
        if expr:
            logger.info("[Milvus] Hybrid search with expr: %s", expr)

        search_params = {
            "metric_type": INDEX_PARAMS["metric"],
            "params": {"ef": INDEX_PARAMS["ef_search"]},
        }

        # --- Try advanced hybrid: AnnSearchRequest + RRFRanker ---
        try:
            from pymilvus import AnnSearchRequest, RRFRanker

            dense_req = AnnSearchRequest(
                data=[query_embedding],
                anns_field="vector",
                param=search_params,
                limit=top_k,
                expr=expr,
            )
            reranker = RRFRanker(k=60)

            results = self.collection.hybrid_search(
                reqs=[dense_req],
                rerank=reranker,
                limit=top_k,
                output_fields=["content"],
            )
            logger.info("[Milvus] Hybrid search via AnnSearchRequest + RRFRanker.")
            return [hit.entity.get("content") for hit in results[0]]

        except (ImportError, TypeError) as exc:
            # Fallback: basic search + expr filter
            logger.info(
                "[Milvus] RRFRanker unavailable (%s), falling back to expr filter.",
                type(exc).__name__,
            )
            results = self.collection.search(
                data=[query_embedding],
                anns_field="vector",
                param=search_params,
                limit=top_k,
                expr=expr,
                output_fields=["content"],
            )
            return [hit.entity.get("content") for hit in results[0]]

    # ------------------------------------------------------------------
    # Reset (for clean benchmark re-runs)
    # ------------------------------------------------------------------
    def reset_collection(self) -> None:
        """
        Drop the existing collection and recreate it with the canonical
        HNSW index — provides a clean slate for benchmark iterations.
        """
        if utility.has_collection(self.collection_name):
            utility.drop_collection(self.collection_name)
            logger.info("[Milvus] Collection '%s' dropped.", self.collection_name)

        # Recreate collection + index + load
        self.connect()
        logger.info("[Milvus] Collection '%s' recreated (clean state).", self.collection_name)
