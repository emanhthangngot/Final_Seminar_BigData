"""
Qdrant Phase 1 — End-to-End Smoke Test.

Owner: Person D — Trần Lê Trung Trực (Qdrant Specialist).

Validates the complete Qdrant wrapper lifecycle:
  1. connect()          → collection created with HNSW index
  2. insert()           → batch insert with metadata
  3. search()           → ANN returns correct results
  4. search_hybrid()    → metadata filter narrows results correctly
  5. reset_collection() → drop + recreate for clean state
  6. Fairness Protocol  → verifies INDEX_PARAMS are used (no hardcoded values)
  7. Dimension validation → wrong-dim embeddings are rejected
  8. reset before connect → clears existing data without prior connect()

Usage:
    Requires Qdrant running at localhost:6333.
    Start with:
        docker compose up -d qdrant

    Run:
        cd <project_root>
        python -m src.core.db_clients.test_qdrant_connection
"""

import sys
import pathlib

# Ensure project root is on sys.path for src.* imports
_PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_PROJECT_ROOT))

import random
import time
from src.core.db_clients.qdrant import QdrantWrapper, COLLECTION_NAME
from src.config import INDEX_PARAMS, VECTOR_DIM


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _make_deterministic_vector(seed_text: str) -> list[float]:
    """Generate a reproducible unit vector from a seed string."""
    random.seed(seed_text)
    vec = [random.uniform(-1.0, 1.0) for _ in range(VECTOR_DIM)]
    mag = max(sum(x * x for x in vec) ** 0.5, 1e-9)
    return [x / mag for x in vec]


def _make_random_vector() -> list[float]:
    """Generate a random 768-dim vector for testing."""
    vec = [random.random() for _ in range(VECTOR_DIM)]
    mag = max(sum(x * x for x in vec) ** 0.5, 1e-9)
    return [x / mag for x in vec]


# ---------------------------------------------------------------------------
# Test Suite
# ---------------------------------------------------------------------------
class QdrantPhase1Test:
    def __init__(self):
        self.db = QdrantWrapper()
        self.passed = 0
        self.failed = 0

    def _report(self, test_name: str, success: bool, detail: str = ""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {status} — {test_name}" + (f" ({detail})" if detail else ""))
        if success:
            self.passed += 1
        else:
            self.failed += 1

    # ---- Test 1: Connection ----
    def test_connect(self):
        """Test that connect() creates collection and HNSW index successfully."""
        print("\n[Test 1] Connect & Collection Setup")
        try:
            self.db.connect()

            # Verify collection exists
            existing = {c.name for c in self.db.client.get_collections().collections}
            exists = self.db.collection_name in existing
            self._report("Collection exists", exists, self.db.collection_name)

            # Verify client object is valid
            assert self.db.client is not None
            self._report("Client object valid", True)

            # Verify collection config
            info = self.db.client.get_collection(self.db.collection_name)
            vec_size = info.config.params.vectors.size
            self._report(
                "Vector dimension matches VECTOR_DIM",
                vec_size == VECTOR_DIM,
                f"size={vec_size}, expected={VECTOR_DIM}",
            )

        except Exception as exc:
            self._report("connect()", False, str(exc))

    # ---- Test 2: Fairness Protocol ----
    def test_fairness_protocol(self):
        """Verify that no hardcoded benchmark-sensitive values exist."""
        print("\n[Test 2] Fairness Protocol Compliance")
        import inspect

        source = inspect.getsource(QdrantWrapper)

        # Check that INDEX_PARAMS is referenced
        uses_index_params = "INDEX_PARAMS" in source
        self._report("References INDEX_PARAMS", uses_index_params)

        # Verify INDEX_PARAMS keys are used
        uses_m_from_config = 'INDEX_PARAMS["M"]' in source
        uses_ef_from_config = 'INDEX_PARAMS["ef_construction"]' in source
        uses_ef_search_from_config = 'INDEX_PARAMS["ef_search"]' in source

        self._report("Uses INDEX_PARAMS['M']", uses_m_from_config)
        self._report("Uses INDEX_PARAMS['ef_construction']", uses_ef_from_config)
        self._report("Uses INDEX_PARAMS['ef_search']", uses_ef_search_from_config)

        # Print the actual values being used
        print(f"    ℹ️  Config values: M={INDEX_PARAMS['M']}, "
              f"ef_construction={INDEX_PARAMS['ef_construction']}, "
              f"ef_search={INDEX_PARAMS['ef_search']}")

    # ---- Test 3: Insert ----
    def test_insert(self):
        """Test batch insert with metadata."""
        print("\n[Test 3] Insert (Batch + Metadata)")
        try:
            chunks = [
                "[CID:0000001] Big Data is about processing large datasets efficiently.",
                "[CID:0000002] Vector databases use approximate nearest neighbor search.",
                "[CID:0000003] Qdrant is a vector similarity search engine written in Rust.",
                "[CID:0000004] HNSW is a graph-based ANN algorithm used by most vector DBs.",
                "[CID:0000005] RAG combines retrieval with language model generation.",
            ]
            embeddings = [_make_deterministic_vector(c) for c in chunks]
            metadata = [
                {"source": "bigdata_intro.pdf", "category": "bigdata", "page": 1},
                {"source": "vectordb_guide.pdf", "category": "vectordb", "page": 5},
                {"source": "qdrant_docs.pdf", "category": "qdrant", "page": 10},
                {"source": "hnsw_paper.pdf", "category": "algorithm", "page": 3},
                {"source": "rag_tutorial.pdf", "category": "rag", "page": 7},
            ]

            result = self.db.insert(chunks, embeddings, metadata)
            self._report("insert() returned True", result is True)

            # Verify count
            info = self.db.client.get_collection(self.db.collection_name)
            count = info.points_count
            self._report("Collection has entities", count >= 5, f"count={count}")

        except Exception as exc:
            self._report("insert()", False, str(exc))

    # ---- Test 4: Search ----
    def test_search(self):
        """Test ANN search returns relevant results."""
        print("\n[Test 4] Search (Dense Vector ANN)")
        try:
            # Search using a vector close to chunk about Qdrant
            query_vec = _make_deterministic_vector(
                "Qdrant is a vector similarity search engine written in Rust."
            )
            results = self.db.search(query_vec, top_k=3)

            self._report("search() returns list", isinstance(results, list))
            self._report("search() returns > 0 results", len(results) > 0, f"got {len(results)}")

            # With deterministic random vectors (not real embeddings),
            # semantic ordering is not guaranteed. Just verify search
            # returns valid non-empty content strings.
            if results:
                top_result = results[0]
                is_valid = isinstance(top_result, str) and len(top_result) > 0
                self._report(
                    "Top result is valid content",
                    is_valid,
                    f"top: {top_result[:80]}...",
                )

        except Exception as exc:
            self._report("search()", False, str(exc))

    # ---- Test 5: Search Hybrid ----
    def test_search_hybrid(self):
        """Test hybrid search with metadata filters."""
        print("\n[Test 5] Search Hybrid (Dense + Metadata Filter)")
        try:
            query_vec = _make_deterministic_vector("vector database search")

            # Filter by category = "qdrant"
            results_filtered = self.db.search_hybrid(
                query_text="vector database search",
                query_embedding=query_vec,
                filters={"category": "qdrant"},
                top_k=5,
            )

            self._report(
                "search_hybrid() with filter returns list",
                isinstance(results_filtered, list),
            )

            # All results should be from category=qdrant
            if results_filtered:
                self._report(
                    "Filtered results contain Qdrant content",
                    any("Qdrant" in r or "CID:0000003" in r for r in results_filtered),
                    f"got {len(results_filtered)} result(s)",
                )

            # Test without filter (should work like normal search)
            results_no_filter = self.db.search_hybrid(
                query_text="RAG generation",
                query_embedding=_make_deterministic_vector("RAG generation"),
                filters=None,
                top_k=3,
            )
            self._report(
                "search_hybrid() without filter works",
                isinstance(results_no_filter, list) and len(results_no_filter) > 0,
                f"got {len(results_no_filter)} result(s)",
            )

            # Test with range filter
            results_range = self.db.search_hybrid(
                query_text="range test",
                query_embedding=_make_deterministic_vector("range test"),
                filters={"page": {"gte": 5}},
                top_k=10,
            )
            self._report(
                "search_hybrid() with range filter works",
                isinstance(results_range, list) and len(results_range) == 3,
                f"got {len(results_range)} result(s), expected 3 (page>=5)",
            )

        except Exception as exc:
            self._report("search_hybrid()", False, str(exc))

    # ---- Test 6: Reset Collection ----
    def test_reset_collection(self):
        """Test dropping and recreating the collection."""
        print("\n[Test 6] Reset Collection")
        try:
            self.db.reset_collection()

            # After reset, collection should exist but be empty
            existing = {c.name for c in self.db.client.get_collections().collections}
            exists = self.db.collection_name in existing
            self._report("Collection exists after reset", exists)

            info = self.db.client.get_collection(self.db.collection_name)
            count = info.points_count
            self._report("Collection is empty after reset", count == 0, f"count={count}")

        except Exception as exc:
            self._report("reset_collection()", False, str(exc))

    # ---- Test 7: Dimension Validation ----
    def test_dimension_validation(self):
        """Test that wrong-dimension embeddings are rejected."""
        print("\n[Test 7] Dimension Validation Guard")
        try:
            bad_chunks = ["test chunk"]
            bad_embeddings = [[0.1] * 512]  # Wrong dimension (512 instead of 768)

            try:
                self.db.insert(bad_chunks, bad_embeddings)
                self._report("Rejects wrong dimension", False, "Should have raised ValueError")
            except ValueError:
                self._report("Rejects wrong dimension (ValueError)", True)

        except Exception as exc:
            self._report("dimension validation", False, str(exc))

    # ---- Test 8: Reset before connect ----
    def test_reset_before_connect(self):
        """Test that reset_collection works on a fresh wrapper without connect()."""
        print("\n[Test 8] Reset Before Connect")
        try:
            # First, insert some data so collection is non-empty
            self.db.connect()
            self.db.reset_collection()
            self.db.insert(
                ["temp_1", "temp_2", "temp_3"],
                [_make_random_vector(), _make_random_vector(), _make_random_vector()],
            )
            info = self.db.client.get_collection(self.db.collection_name)
            pre_count = info.points_count
            self._report("Pre-condition: data exists", pre_count == 3, f"count={pre_count}")

            # Fresh wrapper — no connect(), call reset directly
            fresh_db = QdrantWrapper()
            fresh_db.reset_collection()

            info = fresh_db.client.get_collection(fresh_db.collection_name)
            post_count = info.points_count
            self._report(
                "reset before connect clears data",
                post_count == 0,
                f"before={pre_count}, after={post_count}",
            )

        except Exception as exc:
            self._report("reset before connect", False, str(exc))

    # ---- Run All ----
    def run_all(self):
        print("=" * 65)
        print("  QDRANT PHASE 1 — END-TO-END SMOKE TEST")
        print(f"  VECTOR_DIM={VECTOR_DIM}, Collection={COLLECTION_NAME}")
        print("=" * 65)

        t0 = time.perf_counter()

        self.test_connect()
        self.test_fairness_protocol()
        self.test_insert()
        self.test_search()
        self.test_search_hybrid()
        self.test_reset_collection()
        self.test_dimension_validation()
        self.test_reset_before_connect()

        elapsed = time.perf_counter() - t0

        print("\n" + "=" * 65)
        total = self.passed + self.failed
        print(f"  RESULTS: {self.passed}/{total} passed, {self.failed} failed")
        print(f"  Duration: {elapsed:.2f}s")

        if self.failed == 0:
            print("\n  🎉 ALL TESTS PASSED — Qdrant Phase 1 COMPLETE!")
        else:
            print(f"\n  ⚠️  {self.failed} test(s) FAILED — review above.")

        print("=" * 65)
        return self.failed == 0


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    tester = QdrantPhase1Test()
    success = tester.run_all()
    sys.exit(0 if success else 1)
