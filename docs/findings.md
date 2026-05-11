# Research Findings: RAG Benchmarking Project

## Overview
This document stores all technical discoveries, benchmark results, and non-volatile context collected during the Seminar project execution.

## 1. Vector Database Specifics
- **Qdrant**: (Placeholder for Rust performance notes, memory usage).
- **Weaviate**: Native hybrid search (BM25 + vector) via a single query API, with expressive property filters that map well to RAG metadata (category, page, source). Index parameters are driven by shared `INDEX_PARAMS` for fairness, and `vectorizer_config=none` keeps benchmarking consistent.
- **Milvus**: (Placeholder for C++ distributed architecture notes).

## 2. Ingestion Observations
- **2026-04-13**: Initialized project skeleton and centralized configuration.

## 3. Benchmarking Baseline
(To be updated after first full ingestion cycle)
| Database | Ingestion Time (ms) | Query Latency (p95) | Idle RAM (MB) |
|---|---|---|---|
| Qdrant | | | |
| Weaviate | | | |
| Milvus | | | |

## 4. Weaviate Stage-3 Notes (Hybrid + DX)
Weaviate delivers a practical advantage for hybrid search because keyword and dense vector scoring are combined in one request (`collection.query.hybrid`). This reduces glue code and avoids maintaining a separate BM25 index or external reranking pipeline. In the RAG benchmark, this translates into a simpler code path and faster experimentation with `alpha` values to tune the recall vs latency tradeoff.

The filter API is expressive and directly maps to the metadata schema we use in the corpus (category, page, source). This makes it straightforward to measure hybrid performance under increasingly strict predicates and to communicate clear tradeoffs on the `/hybrid` page. From a DX perspective, the schema and query API are easy to reason about, but the client lifecycle requires explicit `close()` and the SDK version changes are frequent, so locking dependency versions is recommended for reproducibility.

Expected deliverables for Week-3 are captured in `docs/weaviate_stage3_results.json` (accuracy, tradeoff, hybrid sweeps, and resource snapshots). This output is designed for direct handoff to the frontend and slide deck without manual transformation.
