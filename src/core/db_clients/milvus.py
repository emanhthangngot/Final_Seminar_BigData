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
from src.core.benchmark.profiler import time_profiler
from src.core.utils.logger import logger
from src.core.utils.helpers import format_milvus_collection_name


COLLECTION_NAME = format_milvus_collection_name("Seminar_RAG_Collection")

# Batch size for large corpus ingestion — avoids timeout/OOM on 10K+ chunks
INSERT_BATCH_SIZE = 500


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

        # Load collection into memory so search() is available immediately
        self.collection.load()
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

        # Validate dimension
        for i, emb in enumerate(embeddings):
            assert len(emb) == VECTOR_DIM, (
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
            pages.append(int(meta.get("page", 0)))

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

        self.collection.flush()
        logger.info("[Milvus] Inserted %d chunks total and flushed.", total)
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

    @staticmethod
    def _build_expr(filters: Dict[str, Any]) -> Optional[str]:
        """
        Translate a ``filters`` dict into a Milvus boolean expression string.

        Examples:
            {"category": "tech"}          -> 'category == "tech"'
            {"category": "tech", "page": 5} -> 'category == "tech" and page == 5'
        """
        if not filters:
            return None
        parts = []
        for key, value in filters.items():
            if isinstance(value, str):
                safe = value.replace('"', '\\"')
                parts.append(f'{key} == "{safe}"')
            elif isinstance(value, bool):
                parts.append(f"{key} == {str(value).lower()}")
            elif isinstance(value, (int, float)):
                parts.append(f"{key} == {value}")
            else:
                logger.warning(
                    "[Milvus] Unsupported filter type for key '%s': %s",
                    key, type(value).__name__,
                )
        return " and ".join(parts) if parts else None

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
                ranker=reranker,
                limit=top_k,
                output_fields=["content"],
            )
            logger.info("[Milvus] Hybrid search via AnnSearchRequest + RRFRanker.")
            return [hit.entity.get("content") for hit in results[0]]

        except (ImportError, TypeError, Exception) as exc:
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
