"""
Integration + Unit test for PR review round 2.

Covers EXACTLY the team leader's required checks:
1. Insert 5 points
2. QdrantWrapper().reset_collection() on a fresh wrapper (no connect) clears old data
3. Reconnect and assert search returns zero old points
4. Mismatched insert lengths still raise ValueError
5. Empty/unsupported range filter raises ValueError

Run: $env:PYTHONPATH="."; python tests/test_qdrant_pr_review.py
"""

import random
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.config import VECTOR_DIM
from src.core.db_clients.qdrant import QdrantWrapper


def make_vector(dim=VECTOR_DIM):
    return [random.uniform(-1.0, 1.0) for _ in range(dim)]


def run_tests():
    results = {}
    all_pass = True

    def record(name, passed, detail):
        nonlocal all_pass
        status = "[PASS]" if passed else "[FAIL]"
        if not passed:
            all_pass = False
        results[name] = f"{status} - {detail}"
        print(f"  -> {results[name]}\n")

    # ==============================================================
    # SETUP: connect + clean slate
    # ==============================================================
    db = QdrantWrapper()
    db.connect()
    db.reset_collection()
    print("[SETUP] Connected & reset OK\n")

    # ==============================================================
    # TEST 1: Insert 5 points successfully
    # ==============================================================
    print("=" * 60)
    print("TEST 1: Insert 5 points")
    try:
        chunks = [f"chunk_{i}" for i in range(5)]
        embeddings = [make_vector() for _ in range(5)]
        metadata = [{"category": "test", "page": i + 1} for i in range(5)]
        success = db.insert(chunks, embeddings, metadata)
        info = db.client.get_collection(db.collection_name)
        count = info.points_count
        record("insert_5_points", success and count == 5,
               f"success={success}, count={count}")
    except Exception as e:
        record("insert_5_points", False, f"{type(e).__name__}: {e}")

    # ==============================================================
    # TEST 2: reset_collection on FRESH wrapper (no connect) clears data
    # ==============================================================
    print("=" * 60)
    print("TEST 2: QdrantWrapper().reset_collection() without connect() clears old data")
    try:
        fresh_db = QdrantWrapper()  # client=None, never connected
        fresh_db.reset_collection()  # must drop + recreate, NOT reuse

        # Verify collection is empty
        info = fresh_db.client.get_collection(fresh_db.collection_name)
        after_reset_count = info.points_count
        record("reset_before_connect_cleared", after_reset_count == 0,
               f"after_reset_count={after_reset_count} (expected 0)")
    except Exception as e:
        record("reset_before_connect_cleared", False, f"{type(e).__name__}: {e}")

    # ==============================================================
    # TEST 3: Reconnect and search returns zero old points
    # ==============================================================
    print("=" * 60)
    print("TEST 3: Reconnect and search returns zero old points")
    try:
        check_db = QdrantWrapper()
        check_db.connect()
        results_search = check_db.search(make_vector(), top_k=10)
        record("search_after_reset_empty", len(results_search) == 0,
               f"search returned {len(results_search)} results (expected 0)")
    except Exception as e:
        record("search_after_reset_empty", False, f"{type(e).__name__}: {e}")

    # ==============================================================
    # TEST 4a: chunks/embeddings length mismatch -> ValueError
    # ==============================================================
    print("=" * 60)
    print("TEST 4a: len(chunks) != len(embeddings) -> ValueError")
    try:
        check_db.insert(
            chunks=["a", "b", "c"],
            embeddings=[make_vector()],
        )
        record("length_mismatch", False, "did NOT raise ValueError")
    except ValueError as e:
        record("length_mismatch", True, f"ValueError: {e}")
    except Exception as e:
        record("length_mismatch", False, f"wrong exception {type(e).__name__}: {e}")

    # ==============================================================
    # TEST 4b: metadata length mismatch -> ValueError
    # ==============================================================
    print("=" * 60)
    print("TEST 4b: len(metadata) != len(chunks) -> ValueError")
    try:
        check_db.insert(
            chunks=["a", "b"],
            embeddings=[make_vector(), make_vector()],
            metadata=[{"x": 1}],
        )
        record("metadata_mismatch", False, "did NOT raise ValueError")
    except ValueError as e:
        record("metadata_mismatch", True, f"ValueError: {e}")
    except Exception as e:
        record("metadata_mismatch", False, f"wrong exception {type(e).__name__}: {e}")

    # ==============================================================
    # TEST 4c: wrong vector dim -> ValueError
    # ==============================================================
    print("=" * 60)
    print(f"TEST 4c: embedding dim != VECTOR_DIM ({VECTOR_DIM}) -> ValueError")
    try:
        check_db.insert(
            chunks=["a"],
            embeddings=[[0.1] * 10],
        )
        record("dim_mismatch", False, "did NOT raise ValueError")
    except ValueError as e:
        record("dim_mismatch", True, f"ValueError: {e}")
    except Exception as e:
        record("dim_mismatch", False, f"wrong exception {type(e).__name__}: {e}")

    # ==============================================================
    # TEST 5a: empty range filter dict -> ValueError
    # ==============================================================
    print("=" * 60)
    print("TEST 5a: empty range dict {} -> ValueError")
    try:
        check_db.reset_collection()
        check_db.insert(["a"], [make_vector()], [{"page": 1}])
        check_db.search_hybrid("q", make_vector(), filters={"page": {}})
        record("empty_range_filter", False, "did NOT raise ValueError")
    except ValueError as e:
        record("empty_range_filter", True, f"ValueError: {e}")
    except Exception as e:
        record("empty_range_filter", False, f"wrong exception {type(e).__name__}: {e}")

    # ==============================================================
    # TEST 5b: unsupported range operators -> ValueError
    # ==============================================================
    print("=" * 60)
    print('TEST 5b: unsupported range {"eq": 3} -> ValueError')
    try:
        check_db.search_hybrid("q", make_vector(), filters={"page": {"eq": 3}})
        record("unsupported_range_op", False, "did NOT raise ValueError")
    except ValueError as e:
        record("unsupported_range_op", True, f"ValueError: {e}")
    except Exception as e:
        record("unsupported_range_op", False, f"wrong exception {type(e).__name__}: {e}")

    # ==============================================================
    # TEST 6: functional integration path (dense + hybrid + filters)
    # ==============================================================
    print("=" * 60)
    print("TEST 6: Full integration path (insert -> dense -> hybrid -> filters)")
    try:
        check_db.reset_collection()
        check_db.insert(
            chunks=["alpha doc", "beta doc", "gamma doc"],
            embeddings=[make_vector(), make_vector(), make_vector()],
            metadata=[
                {"category": "science", "page": 1},
                {"category": "tech", "page": 5},
                {"category": "science", "page": 10},
            ],
        )

        # Dense search
        r_dense = check_db.search(make_vector(), top_k=3)
        dense_ok = len(r_dense) == 3

        # Hybrid without filter
        r_hybrid = check_db.search_hybrid("query", make_vector(), top_k=3)
        hybrid_ok = len(r_hybrid) == 3

        # Hybrid with category filter
        r_cat = check_db.search_hybrid(
            "query", make_vector(),
            filters={"category": "science"}, top_k=5
        )
        cat_ok = len(r_cat) == 2

        # Hybrid with range filter
        r_range = check_db.search_hybrid(
            "query", make_vector(),
            filters={"page": {"gte": 5}}, top_k=5
        )
        range_ok = len(r_range) == 2

        all_ok = dense_ok and hybrid_ok and cat_ok and range_ok
        record("integration_path", all_ok,
               f"dense={len(r_dense)}/3, hybrid={len(r_hybrid)}/3, "
               f"category={len(r_cat)}/2, range={len(r_range)}/2")
    except Exception as e:
        record("integration_path", False, f"{type(e).__name__}: {e}")

    # ==============================================================
    # SUMMARY
    # ==============================================================
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for name, result in results.items():
        print(f"  {name}: {result}")

    print()
    if all_pass:
        print("ALL TESTS PASSED - Ready to commit and PR!")
    else:
        print("SOME TESTS FAILED - Fix required!")

    return all_pass


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
