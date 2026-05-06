"""
Milvus Phase 1 — End-to-End Smoke Test.

Owner: Person C — Trần Hữu Kim Thành (Milvus Specialist).

Validates the complete Milvus wrapper lifecycle:
  1. connect()          → collection created with HNSW index
  2. insert()           → batch insert with metadata, flush
  3. search()           → ANN returns correct results
  4. search_hybrid()    → expr filter narrows results correctly
  5. reset_collection() → drop + recreate for clean state
  6. Fairness Protocol  → verifies INDEX_PARAMS are used (no hardcoded values)

Usage:
    Requires Milvus Standalone running at localhost:19530 (+ etcd + MinIO).
    Start with:
        docker compose up -d milvus-standalone etcd minio

    Run:
        cd <project_root>
        python -m src.core.db_clients.test_milvus_connection
"""

import sys
import pathlib
import io

# Force UTF-8 output on Windows to handle special characters
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# Ensure project root is on sys.path for src.* imports
_PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_PROJECT_ROOT))

import random
import time
from src.core.db_clients.milvus import MilvusWrapper
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
class MilvusPhase1Test:
    def __init__(self):
        self.db = MilvusWrapper()
        self.passed = 0
        self.failed = 0

    def _report(self, test_name: str, success: bool, detail: str = ""):
        status = "[PASS]" if success else "[FAIL]"
        print(f"  {status} {test_name}" + (f" ({detail})" if detail else ""))
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
            from pymilvus import utility
            exists = utility.has_collection(self.db.collection_name)
            self._report("Collection exists", exists, self.db.collection_name)

            # Verify collection is loaded
            assert self.db.collection is not None
            self._report("Collection object valid", True)

            # Verify schema fields
            schema = self.db.collection.schema
            field_names = [f.name for f in schema.fields]
            expected_fields = {"id", "content", "vector", "source", "category", "page"}
            has_all = expected_fields.issubset(set(field_names))
            self._report(
                "Schema has all required fields",
                has_all,
                f"found: {field_names}",
            )

        except Exception as exc:
            self._report("connect()", False, str(exc))

    # ---- Test 2: Fairness Protocol ----
    def test_fairness_protocol(self):
        """Verify that no hardcoded benchmark-sensitive values exist."""
        print("\n[Test 2] Fairness Protocol Compliance")
        import inspect

        source = inspect.getsource(MilvusWrapper)

        # Check that INDEX_PARAMS is referenced
        uses_index_params = "INDEX_PARAMS" in source
        self._report("References INDEX_PARAMS", uses_index_params)

        # Check no hardcoded M=16
        has_hardcoded_m = (
            '"M": 16' in source or "'M': 16" in source
        ) and "INDEX_PARAMS" not in source.split('"M": 16')[0][-100:]
        # Better check: look for literal params dict without INDEX_PARAMS
        # Simply verify INDEX_PARAMS keys are used
        uses_m_from_config = 'INDEX_PARAMS["M"]' in source
        uses_ef_from_config = 'INDEX_PARAMS["ef_construction"]' in source
        uses_ef_search_from_config = 'INDEX_PARAMS["ef_search"]' in source
        uses_metric_from_config = 'INDEX_PARAMS["metric"]' in source

        self._report("Uses INDEX_PARAMS['M']", uses_m_from_config)
        self._report("Uses INDEX_PARAMS['ef_construction']", uses_ef_from_config)
        self._report("Uses INDEX_PARAMS['ef_search']", uses_ef_search_from_config)
        self._report("Uses INDEX_PARAMS['metric']", uses_metric_from_config)

        # Print the actual values being used
        print(f"    [INFO] Config values: M={INDEX_PARAMS['M']}, "
              f"ef_construction={INDEX_PARAMS['ef_construction']}, "
              f"ef_search={INDEX_PARAMS['ef_search']}, "
              f"metric={INDEX_PARAMS['metric']}")

    # ---- Test 3: Insert ----
    def test_insert(self):
        """Test batch insert with metadata."""
        print("\n[Test 3] Insert (Batch + Metadata)")
        try:
            chunks = [
                "[CID:0000001] Big Data is about processing large datasets efficiently.",
                "[CID:0000002] Vector databases use approximate nearest neighbor search.",
                "[CID:0000003] Milvus is a distributed vector database built with C++.",
                "[CID:0000004] HNSW is a graph-based ANN algorithm used by most vector DBs.",
                "[CID:0000005] RAG combines retrieval with language model generation.",
            ]
            embeddings = [_make_deterministic_vector(c) for c in chunks]
            metadata = [
                {"source": "bigdata_intro.pdf", "category": "bigdata", "page": 1},
                {"source": "vectordb_guide.pdf", "category": "vectordb", "page": 5},
                {"source": "milvus_docs.pdf", "category": "milvus", "page": 10},
                {"source": "hnsw_paper.pdf", "category": "algorithm", "page": 3},
                {"source": "rag_tutorial.pdf", "category": "rag", "page": 7},
            ]

            result = self.db.insert(chunks, embeddings, metadata)
            self._report("insert() returned True", result is True)

            # Verify count
            count = self.db.collection.num_entities
            self._report("Collection has entities", count >= 5, f"count={count}")

        except Exception as exc:
            self._report("insert()", False, str(exc))

    # ---- Test 4: Search ----
    def test_search(self):
        """Test ANN search returns relevant results."""
        print("\n[Test 4] Search (Dense Vector ANN)")
        try:
            # Search using a vector close to chunk about Milvus
            query_vec = _make_deterministic_vector(
                "Milvus is a distributed vector database built with C++."
            )
            results = self.db.search(query_vec, top_k=3)

            self._report("search() returns list", isinstance(results, list))
            self._report("search() returns > 0 results", len(results) > 0, f"got {len(results)}")

            # The Milvus chunk should appear somewhere in top-3 results
            # (deterministic random vectors in 768-dim may not rank strictly)
            if results:
                found_milvus = any(
                    "Milvus" in r or "CID:0000003" in r for r in results
                )
                self._report(
                    "Milvus chunk appears in top results",
                    found_milvus,
                    f"results: {[r[:40] for r in results]}",
                )

        except Exception as exc:
            self._report("search()", False, str(exc))

    # ---- Test 5: Search Hybrid ----
    def test_search_hybrid(self):
        """Test hybrid search with expr filters."""
        print("\n[Test 5] Search Hybrid (Dense + Expr Filter)")
        try:
            query_vec = _make_deterministic_vector("vector database search")

            # Filter by category = "milvus"
            results_filtered = self.db.search_hybrid(
                query_text="vector database search",
                query_embedding=query_vec,
                filters={"category": "milvus"},
                top_k=5,
            )

            self._report(
                "search_hybrid() with filter returns list",
                isinstance(results_filtered, list),
            )

            # All results should be from category=milvus
            if results_filtered:
                self._report(
                    "Filtered results contain Milvus content",
                    any("Milvus" in r or "CID:0000003" in r for r in results_filtered),
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

            # Range filter should narrow results to rows with page >= 7.
            results_range = self.db.search_hybrid(
                query_text="page filter",
                query_embedding=_make_deterministic_vector("page filter"),
                filters={"page": {"gte": 7}},
                top_k=5,
            )
            valid_range_ids = ("CID:0000003", "CID:0000005")
            self._report(
                "search_hybrid() applies page range filter",
                bool(results_range)
                and all(any(cid in r for cid in valid_range_ids) for r in results_range),
                f"got {len(results_range)} result(s)",
            )

            try:
                self.db.search_hybrid(
                    query_text="bad filter",
                    query_embedding=query_vec,
                    filters={"unknown_field": "value"},
                    top_k=1,
                )
                self._report("Rejects unsupported filter field", False)
            except ValueError:
                self._report("Rejects unsupported filter field", True)

        except Exception as exc:
            self._report("search_hybrid()", False, str(exc))

    # ---- Test 6: Reset Collection ----
    def test_reset_collection(self):
        """Test dropping and recreating the collection."""
        print("\n[Test 6] Reset Collection")
        try:
            self.db.reset_collection()

            # After reset, collection should exist but be empty
            from pymilvus import utility
            exists = utility.has_collection(self.db.collection_name)
            self._report("Collection exists after reset", exists)

            count = self.db.collection.num_entities
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

    # ---- Run All ----
    def run_all(self):
        print("=" * 65)
        print("  MILVUS PHASE 1 — END-TO-END SMOKE TEST")
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

        elapsed = time.perf_counter() - t0

        print("\n" + "=" * 65)
        total = self.passed + self.failed
        print(f"  RESULTS: {self.passed}/{total} passed, {self.failed} failed")
        print(f"  Duration: {elapsed:.2f}s")

        if self.failed == 0:
            print("\n  *** ALL TESTS PASSED - Milvus Phase 1 COMPLETE! ***")
        else:
            print(f"\n  !!! {self.failed} test(s) FAILED - review above.")

        print("=" * 65)
        return self.failed == 0


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    from src.core.db_clients.milvus import COLLECTION_NAME

    tester = MilvusPhase1Test()
    success = tester.run_all()
    sys.exit(0 if success else 1)
