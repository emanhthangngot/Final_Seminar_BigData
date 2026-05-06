"""
Qdrant Vector Database Wrapper.

Owner: Person D — Trần Lê Trung Trực (Qdrant Specialist).

Implements the BaseVectorDB interface for Qdrant.
All HNSW parameters are sourced from ``src.config.INDEX_PARAMS`` to satisfy
the Fairness Protocol — no benchmark-sensitive values are hardcoded.

Capabilities:
  - connect()          : create/load collection with canonical HNSW index
  - insert()           : validated batch insert, profiled via @time_profiler
  - search()           : ANN search using INDEX_PARAMS for search_params
  - search_hybrid()    : dense vector search with Qdrant Filter conditions
  - reset_collection() : drop + recreate for clean benchmark runs
"""

from typing import List, Dict, Any, Optional

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


class QdrantWrapper(BaseVectorDB):
    """
    Qdrant wrapper implementing the BaseVectorDB contract.

    All index tuning knobs read from ``INDEX_PARAMS`` (Fairness Protocol).
    """

    def __init__(self) -> None:
        self.client: Optional[QdrantClient] = None
        self.collection_name: str = COLLECTION_NAME

    # ------------------------------------------------------------------
    # Connection & Collection Management
    # ------------------------------------------------------------------
    def _ensure_client(self) -> None:
        """Ensure a live QdrantClient exists; create one if needed."""
        if self.client is None:
            self.client = QdrantClient(host=QDRANT_HOST, port=QDRANT_HTTP_PORT)
            self.collection_name = COLLECTION_NAME

    def _create_collection(self) -> None:
        """Create the collection with canonical HNSW index (Fairness Protocol)."""
        self.client.create_collection(
            collection_name=self.collection_name,
            vectors_config=models.VectorParams(
                size=VECTOR_DIM,
                distance=models.Distance.COSINE,
            ),
            # ========== FAIRNESS PROTOCOL ==========
            hnsw_config=models.HnswConfigDiff(
                m=INDEX_PARAMS["M"],                          # 16
                ef_construct=INDEX_PARAMS["ef_construction"], # 128
            ),
        )
        logger.info(
            "[Qdrant] Collection '%s' created with HNSW M=%d, ef_construct=%d.",
            self.collection_name,
            INDEX_PARAMS["M"],
            INDEX_PARAMS["ef_construction"],
        )

    def connect(self) -> None:
        self._ensure_client()

        existing = {c.name for c in self.client.get_collections().collections}
        if self.collection_name not in existing:
            self._create_collection()
        else:
            logger.info("[Qdrant] Collection '%s' already exists.", self.collection_name)

    # ------------------------------------------------------------------
    # Insert (with input validation)
    # ------------------------------------------------------------------
    @time_profiler
    def insert(
        self,
        chunks: List[str],
        embeddings: List[List[float]],
        metadata: List[Dict[str, Any]] = None,
    ) -> bool:
        """
        Batch insert chunks + embeddings into Qdrant.

        Parameters
        ----------
        chunks : list[str]
            Text content of each chunk.
        embeddings : list[list[float]]
            Corresponding vector embeddings (dim must equal VECTOR_DIM).
        metadata : list[dict], optional
            Per-chunk metadata. Recognised keys: ``category``, ``page``, etc.

        Raises
        ------
        ValueError
            If ``chunks`` and ``embeddings`` have different lengths,
            if ``metadata`` is provided but its length differs from ``chunks``,
            or if any embedding's dimension does not match ``VECTOR_DIM``.
        """
        import uuid

        # ── Guard: empty input ──────────────────────────────────────
        if not chunks:
            logger.warning("[Qdrant] insert() called with empty chunks list.")
            return False

        # ── Validate: chunks ↔ embeddings length match ──────────────
        if len(chunks) != len(embeddings):
            raise ValueError(
                f"[Qdrant] Length mismatch: chunks={len(chunks)}, "
                f"embeddings={len(embeddings)}. "
                "All input lists must have the same length."
            )

        # ── Validate: metadata length (if provided) ─────────────────
        if metadata is not None and len(metadata) != len(chunks):
            raise ValueError(
                f"[Qdrant] Length mismatch: chunks={len(chunks)}, "
                f"metadata={len(metadata)}. "
                "metadata list must match chunks length when provided."
            )

        # ── Validate: every vector must have dim == VECTOR_DIM ──────
        for i, emb in enumerate(embeddings):
            if len(emb) != VECTOR_DIM:
                raise ValueError(
                    f"[Qdrant] Embedding #{i} has dim={len(emb)}, "
                    f"expected {VECTOR_DIM}"
                )

        # ── Build PointStruct list ──────────────────────────────────
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

        self.client.upload_points(
            collection_name=self.collection_name, points=points, wait=True
        )
        logger.info("[Qdrant] Inserted %d points in a single payload.", len(points))
        return True

    # ------------------------------------------------------------------
    # Dense Vector Search (ANN)
    # ------------------------------------------------------------------
    @time_profiler
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        """Standard ANN search using the canonical search params from INDEX_PARAMS."""
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

    # ------------------------------------------------------------------
    # Hybrid Search (Dense + Metadata Filter)
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
        Dense vector search combined with Qdrant Filter conditions.

        Translates the ``filters`` dict into Qdrant FieldConditions, e.g.
        ``{"category": "tech"}`` becomes a MatchValue condition and
        ``{"page": {"gte": 1, "lte": 10}}`` becomes a Range condition.

        Parameters
        ----------
        query_text : str
            Original query string (reserved for future sparse/BM25 integration).
        query_embedding : list[float]
            Dense query vector.
        filters : dict, optional
            Key-value pairs to AND-combine into Filter conditions.
            - Plain values use ``MatchValue``.
            - Dict values with gte/lte/gt/lt keys use ``Range``.
        top_k : int
            Number of results to return.
        """
        query_filter = None
        if filters:
            must_conditions = []
            for key, value in filters.items():
                if isinstance(value, dict):
                    range_kwargs = {
                        op: value[op]
                        for op in ("gte", "lte", "gt", "lt")
                        if op in value
                    }
                    if not range_kwargs:
                        raise ValueError(
                            f"[Qdrant] Unsupported or empty range filter "
                            f"for key '{key}': {value}"
                        )
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

    # ------------------------------------------------------------------
    # Reset (for clean benchmark re-runs)
    # ------------------------------------------------------------------
    def reset_collection(self) -> None:
        """
        Drop the existing collection and recreate it with the canonical
        HNSW index — provides a clean slate for benchmark iterations.

        Safe to call before ``connect()`` — if the client is not yet
        initialised, it will be created automatically.

        Always guarantees a **clean, empty** collection after returning,
        regardless of prior state.
        """
        # Ensure we have a live client (creates one if needed)
        self._ensure_client()

        # Drop if exists
        existing = {c.name for c in self.client.get_collections().collections}
        if self.collection_name in existing:
            self.client.delete_collection(self.collection_name)
            logger.info("[Qdrant] Collection '%s' dropped.", self.collection_name)

        # Recreate with canonical HNSW index
        self._create_collection()
        logger.info("[Qdrant] Collection '%s' recreated (clean state).", self.collection_name)
