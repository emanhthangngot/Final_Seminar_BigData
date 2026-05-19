"""
Embedder module -- creates vector embeddings for text chunks.

Optimisation layers (applied in order):
  1. **Disk cache**: MD5-keyed JSON files under ``data/.embed_cache/``.
     Re-uploading the same PDF skips embedding entirely (<0.5 s).
  2. **Ollama native batch**: POST ``/api/embed`` with ``input: [...]``
     sends all texts in a single HTTP request (Ollama ≥ 0.5).
  3. **Parallel fallback**: If the batch endpoint is unavailable, texts
     are embedded in parallel threads using ``/api/embeddings``.
  4. **Mock mode**: Deterministic 768-dim vectors derived from a hash
     of the input text.  Identical inputs always produce identical vectors.
"""

import hashlib
import json
import os
import random
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional

from src.config import (
    MOCK_MODE,
    OLLAMA_BASE_URL,
    EMBEDDING_MODEL,
    VECTOR_DIM,
    DATA_DIR,
)
from src.core.utils.logger import logger

# ---------------------------------------------------------------------------
# Cache directory — sits alongside uploaded data
# ---------------------------------------------------------------------------
CACHE_DIR = str(DATA_DIR / ".embed_cache")

# Parallel embedding config
_MAX_WORKERS = 4          # concurrent HTTP requests for fallback path
_PARALLEL_BATCH_SIZE = 8  # chunks per worker in fallback mode


class Embedder:
    """Unified embedding interface for Ollama or explicit mock mode."""

    def __init__(self):
        self._live_embeddings = None
        self._supports_batch: Optional[bool] = None  # lazy-detected

        if MOCK_MODE:
            logger.info(
                "[Embedder] MOCK_MODE is active. "
                "Returning deterministic %d-dim vectors.", VECTOR_DIM
            )
        else:
            try:
                from langchain_community.embeddings import OllamaEmbeddings
                self._live_embeddings = OllamaEmbeddings(
                    base_url=OLLAMA_BASE_URL,
                    model=EMBEDDING_MODEL,
                )
                logger.info(
                    "[Embedder] Connected to Ollama at %s with model %s",
                    OLLAMA_BASE_URL, EMBEDDING_MODEL,
                )
            except Exception as exc:
                message = (
                    f"[Embedder] Failed to initialise OllamaEmbeddings at "
                    f"{OLLAMA_BASE_URL} with model {EMBEDDING_MODEL}: {exc}"
                )
                logger.error(message)
                raise RuntimeError(message) from exc

    # ------------------------------------------------------------------
    # Disk Cache helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _cache_key(text: str) -> str:
        return hashlib.md5(text.encode("utf-8", errors="replace")).hexdigest()

    def _load_cached(self, text: str) -> Optional[List[float]]:
        path = os.path.join(CACHE_DIR, f"{self._cache_key(text)}.json")
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    vec = json.load(f)
                if len(vec) == VECTOR_DIM:
                    return vec
            except Exception:
                pass
        return None

    def _save_cached(self, text: str, vector: List[float]) -> None:
        os.makedirs(CACHE_DIR, exist_ok=True)
        path = os.path.join(CACHE_DIR, f"{self._cache_key(text)}.json")
        try:
            with open(path, "w") as f:
                json.dump(vector, f)
        except Exception:
            pass  # non-critical

    # ------------------------------------------------------------------
    # Mock helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _deterministic_vector(text: str) -> List[float]:
        """Return a reproducible 768-dim float vector seeded by *text*."""
        # Use python's built-in random seeded with text to guarantee determinism
        random.seed(text)
        vector = [random.uniform(-1.0, 1.0) for _ in range(VECTOR_DIM)]
        # Normalise to a unit vector so cosine similarity is meaningful
        magnitude = max(sum(x * x for x in vector) ** 0.5, 1e-9)
        return [x / magnitude for x in vector]

    # ------------------------------------------------------------------
    # Ollama native batch endpoint (fast path)
    # ------------------------------------------------------------------
    def _try_batch_embed(self, texts: List[str]) -> Optional[List[List[float]]]:
        """
        Try Ollama's native ``/api/embed`` batch endpoint (Ollama ≥ 0.5).
        Returns None if the endpoint is unavailable or errors out.
        """
        if self._supports_batch is False:
            return None

        import requests
        url = f"{OLLAMA_BASE_URL}/api/embed"
        try:
            t0 = time.perf_counter()
            resp = requests.post(
                url,
                json={"model": EMBEDDING_MODEL, "input": texts},
                timeout=120,
            )
            if resp.status_code != 200:
                self._supports_batch = False
                logger.info(
                    "[Embedder] Batch /api/embed returned %d — falling back.",
                    resp.status_code,
                )
                return None

            data = resp.json()
            embeddings = data.get("embeddings")
            if not embeddings or len(embeddings) != len(texts):
                self._supports_batch = False
                return None

            self._supports_batch = True
            elapsed = (time.perf_counter() - t0) * 1000
            logger.info(
                "[Embedder] Batch /api/embed: %d texts in %.0f ms (%.1f ms/text).",
                len(texts), elapsed, elapsed / len(texts),
            )
            return embeddings

        except Exception as exc:
            self._supports_batch = False
            logger.info("[Embedder] Batch endpoint unavailable: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Parallel single-text fallback
    # ------------------------------------------------------------------
    def _embed_single_ollama(self, text: str) -> List[float]:
        """Embed one text via Ollama /api/embeddings (single-text endpoint)."""
        import requests
        resp = requests.post(
            f"{OLLAMA_BASE_URL}/api/embeddings",
            json={"model": EMBEDDING_MODEL, "prompt": text},
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["embedding"]

    def _parallel_embed(self, texts: List[str]) -> List[List[float]]:
        """Embed texts in parallel threads using single-text Ollama API."""
        t0 = time.perf_counter()
        results: List[Optional[List[float]]] = [None] * len(texts)

        with ThreadPoolExecutor(max_workers=_MAX_WORKERS) as pool:
            future_to_idx = {
                pool.submit(self._embed_single_ollama, text): idx
                for idx, text in enumerate(texts)
            }
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                results[idx] = future.result()

        elapsed = (time.perf_counter() - t0) * 1000
        logger.info(
            "[Embedder] Parallel embed: %d texts in %.0f ms (%d workers).",
            len(texts), elapsed, _MAX_WORKERS,
        )
        return results  # type: ignore[return-value]

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Batch-embed a list of text chunks.

        Strategy (live mode):
          1. Check disk cache — skip already-embedded texts.
          2. Try Ollama batch ``/api/embed`` for uncached texts.
          3. Fall back to parallel single-text requests.
        """
        if MOCK_MODE:
            return [self._deterministic_vector(t) for t in texts]

        # --- Phase 1: Separate cached vs uncached ---
        vectors: List[Optional[List[float]]] = [None] * len(texts)
        uncached_indices: List[int] = []
        uncached_texts: List[str] = []

        for i, text in enumerate(texts):
            cached = self._load_cached(text)
            if cached is not None:
                vectors[i] = cached
            else:
                uncached_indices.append(i)
                uncached_texts.append(text)

        cache_hits = len(texts) - len(uncached_texts)
        if cache_hits > 0:
            logger.info(
                "[Embedder] Cache: %d/%d hits, %d to embed.",
                cache_hits, len(texts), len(uncached_texts),
            )

        if not uncached_texts:
            return vectors  # type: ignore[return-value]

        # --- Phase 2: Try batch embed ---
        new_vectors = self._try_batch_embed(uncached_texts)

        # --- Phase 3: Fallback to parallel single-text ---
        if new_vectors is None:
            if self._live_embeddings is not None:
                # Use LangChain's OllamaEmbeddings (sequential — last resort)
                try:
                    new_vectors = self._parallel_embed(uncached_texts)
                except Exception:
                    logger.warning("[Embedder] Parallel embed failed, using LangChain sequential.")
                    new_vectors = self._live_embeddings.embed_documents(uncached_texts)
            else:
                new_vectors = self._parallel_embed(uncached_texts)

        # --- Phase 4: Validate + cache + merge ---
        for rel_idx, abs_idx in enumerate(uncached_indices):
            vec = new_vectors[rel_idx]
            assert len(vec) == VECTOR_DIM, (
                f"Dimension mismatch: expected {VECTOR_DIM}, got {len(vec)}"
            )
            vectors[abs_idx] = vec
            self._save_cached(uncached_texts[rel_idx], vec)

        # Final validation
        for v in vectors:
            assert v is not None and len(v) == VECTOR_DIM
        return vectors  # type: ignore[return-value]

    def embed_query(self, text: str) -> List[float]:
        """Embed a single query string."""
        if MOCK_MODE:
            vector = self._deterministic_vector(text)
        else:
            # Queries are NOT cached — they should always be live
            result = self._try_batch_embed([text])
            if result is not None:
                vector = result[0]
            elif self._live_embeddings is not None:
                vector = self._live_embeddings.embed_query(text)
            else:
                vector = self._embed_single_ollama(text)

        assert len(vector) == VECTOR_DIM, (
            f"Dimension mismatch: expected {VECTOR_DIM}, got {len(vector)}"
        )
        return vector
