"""
Embedder module -- creates vector embeddings for text chunks.

When MOCK_MODE is enabled the module returns deterministic 768-dimension
vectors that are derived from a hash of the input text.  This guarantees
that identical inputs always produce identical vectors, which is critical
for reproducible benchmarking even without a live Ollama instance.
"""

import random
from typing import List

from src.config import MOCK_MODE, OLLAMA_BASE_URL, EMBEDDING_MODEL, VECTOR_DIM
from src.core.utils.logger import logger


class Embedder:
    """Unified embedding interface with automatic mock fallback."""

    def __init__(self):
        self._live_embeddings = None

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
                logger.warning(
                    "[Embedder] Failed to initialise OllamaEmbeddings (%s). "
                    "Falling back to mock vectors.", exc
                )

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
    # Public API
    # ------------------------------------------------------------------
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Batch-embed a list of text chunks."""
        if self._live_embeddings is not None:
            vectors = self._live_embeddings.embed_documents(texts)
        else:
            vectors = [self._deterministic_vector(t) for t in texts]

        # Validate dimension
        for v in vectors:
            assert len(v) == VECTOR_DIM, (
                f"Dimension mismatch: expected {VECTOR_DIM}, got {len(v)}"
            )
        return vectors

    def embed_query(self, text: str) -> List[float]:
        """Embed a single query string."""
        if self._live_embeddings is not None:
            vector = self._live_embeddings.embed_query(text)
        else:
            vector = self._deterministic_vector(text)

        assert len(vector) == VECTOR_DIM, (
            f"Dimension mismatch: expected {VECTOR_DIM}, got {len(vector)}"
        )
        return vector
