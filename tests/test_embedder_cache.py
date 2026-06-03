import unittest
from threading import RLock

from src.config import VECTOR_DIM
from src.core.data_ingestion.embedder import Embedder


class EmbedderCacheTest(unittest.TestCase):
    def test_embed_documents_deduplicates_uncached_texts_in_one_batch(self):
        embedder = object.__new__(Embedder)
        embedder._live_embeddings = None
        embedder._supports_batch = True
        embedder._cache = {}
        embedder._cache_dirty = False
        embedder._cache_lock = RLock()

        cache = {}
        requested_batches = []

        def load_cached(text):
            return cache.get(text)

        def save_cached(text, vector):
            cache[text] = vector

        def try_batch_embed(texts):
            requested_batches.append(list(texts))
            return [[float(i)] * VECTOR_DIM for i, _text in enumerate(texts, start=1)]

        embedder._load_cached = load_cached
        embedder._save_cached = save_cached
        embedder._try_batch_embed = try_batch_embed

        vectors = embedder.embed_documents(["alpha", "alpha", "beta", "alpha"])

        self.assertEqual(requested_batches, [["alpha", "beta"]])
        self.assertEqual(vectors[0], vectors[1])
        self.assertEqual(vectors[0], vectors[3])
        self.assertNotEqual(vectors[0], vectors[2])
        self.assertEqual(set(cache), {"alpha", "beta"})


if __name__ == "__main__":
    unittest.main()
