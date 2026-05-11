"""
Benchmark corpus + golden-query generator.

This module produces two things deterministically (seeded by BENCH_SEED):
  1. A synthetic text corpus of `BENCH_CORPUS_SIZE` chunks, each prefixed with
     a unique tag `[CID:XXXX]` so that retrieval results can be matched back
     to their ground-truth identity with exact equality.
  2. A set of `BENCH_NUM_QUERIES` golden (query, expected_chunk_id) pairs
     constructed from the corpus. Each query is derived from a substring of
     its target chunk, so semantically the embedding of the query should land
     near the embedding of the target chunk — giving a fair accuracy test.

Design rationale
----------------
The old evaluator used substring matching on arbitrary demo QA pairs, which
is neither reproducible nor academically sound. Using deterministic chunk IDs
embedded *inside* the text lets us:
  - Run Recall@K with exact identity matching (no LLM-as-judge needed).
  - Scale to BENCH_CORPUS_SIZE = 10K / 100K without manual labelling.
  - Give all three databases the exact same corpus and queries.
"""

from __future__ import annotations

import random
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

from src.config import (
    BENCH_CORPUS_SIZE,
    BENCH_NUM_QUERIES,
    BENCH_SEED,
    CHUNK_ID_PREFIX,
)


_TOPIC_TEMPLATES = [
    "Vector databases such as {db} use the {algo} algorithm to perform approximate nearest neighbour search across high dimensional embedding spaces.",
    "The {db} engine stores dense vectors of dimension {dim} and supports {metric} similarity for retrieval augmented generation pipelines.",
    "{db} exposes a {proto} API that lets clients upsert, filter, and query millions of points with sub-second latency on commodity hardware.",
    "Benchmarking {db} against classical databases shows that index build time grows roughly with N log N when using {algo}.",
    "A production RAG deployment on {db} typically pairs it with an embedding model like {embed_model} and an LLM such as {llm} for grounded answer generation.",
    "Memory footprint on {db} can be reduced by up to {factor} times using product quantization while keeping recall above {recall} percent.",
    "{db} cluster operators monitor CPU, RSS memory, and tail latency at the ninety-fifth percentile to detect regressions after schema changes.",
    "When filter selectivity drops below {sel} percent on {db}, pre-filtering beats post-filtering because fewer candidate vectors survive the scalar predicate.",
    "Hybrid search on {db} combines dense vector scoring with sparse BM25 keyword matches reranked through reciprocal rank fusion.",
    "Cold-start latency on {db} is dominated by collection loading; lazy loading and index mmap can cut the first-query wait substantially.",
]

_DB_NAMES = ["Qdrant", "Weaviate", "Milvus"]
_ALGOS = ["HNSW", "IVF_FLAT", "IVF_PQ", "DiskANN", "ScaNN"]
_PROTOS = ["gRPC", "REST", "HTTP2", "Thrift"]
_EMBED_MODELS = ["nomic-embed-text", "bge-small-en", "e5-large"]
_LLMS = ["qwen2.5", "llama3", "mistral-7b"]
_METRICS = ["cosine", "dot product", "Euclidean"]

# Categories used for metadata — filter_benchmark.py references these.
_CATEGORIES = ["tech", "science", "engineering", "research", "ops"]


@dataclass
class GoldenPair:
    query: str
    chunk_id: str


def _make_chunk_text(rng: random.Random, idx: int) -> str:
    tmpl = rng.choice(_TOPIC_TEMPLATES)
    filled = tmpl.format(
        db=rng.choice(_DB_NAMES),
        algo=rng.choice(_ALGOS),
        proto=rng.choice(_PROTOS),
        embed_model=rng.choice(_EMBED_MODELS),
        llm=rng.choice(_LLMS),
        metric=rng.choice(_METRICS),
        dim=rng.choice([384, 512, 768, 1024, 1536]),
        factor=rng.choice([4, 8, 16, 32, 64]),
        recall=rng.randint(90, 99),
        sel=rng.randint(1, 30),
    )
    # Sprinkle a tiny tail so two chunks that pick the same template aren't identical.
    tail = f" Document index {idx} annotation {rng.randint(1000, 9999)}."
    return filled + tail


def _chunk_id_for(idx: int) -> str:
    return f"{CHUNK_ID_PREFIX}_{idx:07d}"


def _wrap_with_id(chunk_id: str, text: str) -> str:
    return f"[{chunk_id}] {text}"


def build_corpus(
    size: int = None, seed: int = None,
) -> Tuple[List[str], List[str], List[Dict[str, Any]]]:
    """
    Build a deterministic synthetic corpus with metadata.

    Returns
    -------
    texts : List[str]
        Chunks ready to be embedded & inserted (each starts with the CID tag).
    ids : List[str]
        The chunk_id for each text, in the same order.
    metadata : List[Dict[str, Any]]
        Per-chunk metadata with keys: ``source``, ``category``, ``page``.
        Deterministic based on seed — ensures filter_benchmark scenarios
        can match data in the collection.
    """
    size = size or BENCH_CORPUS_SIZE
    seed = seed or BENCH_SEED
    rng = random.Random(seed)

    texts: List[str] = []
    ids: List[str] = []
    metadata: List[Dict[str, Any]] = []
    for i in range(size):
        cid = _chunk_id_for(i)
        body = _make_chunk_text(rng, i)
        texts.append(_wrap_with_id(cid, body))
        ids.append(cid)
        metadata.append({
            "source": f"bench_doc_{i // 50:04d}.pdf",
            "category": _CATEGORIES[i % len(_CATEGORIES)],
            "page": (i % 20) + 1,  # pages 1-20 cycling
        })
    return texts, ids, metadata


def build_golden_queries(
    corpus: List[str],
    ids: List[str],
    num_queries: int = None,
    seed: int = None,
) -> List[GoldenPair]:
    """
    Pick `num_queries` random chunks and derive a short query from each.

    The query is a contiguous window of ~14 words taken from the middle of
    the target chunk and then lightly perturbed (lowercase, strip CID tag).
    The embedding of that query will land near the target chunk's embedding
    for any reasonable encoder, giving a realistic Recall@K signal.
    """
    num_queries = num_queries or BENCH_NUM_QUERIES
    seed = seed or BENCH_SEED
    rng = random.Random(seed + 1)

    pairs: List[GoldenPair] = []
    indices = rng.sample(range(len(corpus)), min(num_queries, len(corpus)))
    for i in indices:
        text = corpus[i]
        # Drop the [CID:...] prefix before querying — otherwise we'd leak the label.
        stripped = re.sub(r"^\[[^\]]+\]\s*", "", text)
        words = stripped.split()
        start = rng.randint(0, max(0, len(words) - 14))
        window = " ".join(words[start : start + 14]).lower()
        pairs.append(GoldenPair(query=window, chunk_id=ids[i]))
    return pairs


_CID_RE = re.compile(r"^\[(" + re.escape(CHUNK_ID_PREFIX) + r"_\d+)\]")


def extract_chunk_id(text: str) -> str | None:
    """Return the CID embedded at the start of a retrieved chunk, or None."""
    if not text:
        return None
    m = _CID_RE.match(text)
    return m.group(1) if m else None
