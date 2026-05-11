# Weaviate Stage 3 Report (Final)

## 1. Scope
- Run final benchmark (corpus_size=10000, num_queries=200) cho Weaviate.
- Sinh du lieu output: recall, tradeoff, metrics, va JSON tong hop.
- Hybrid sweep voi `alpha` = 0.25 / 0.50 / 0.75 va filter phuc tap dan.

## 2. Environment + Fairness
- HNSW params tu `INDEX_PARAMS` (M=16, ef_construction=128, ef_search=64, metric=cosine).
- Embedding model: `nomic-embed-text` qua Ollama (MOCK_MODE=false) khi chay trong container backend.
- Resource snapshot (neu can) lay tu host-run (Docker API) do container backend khong co Docker socket.

## 3. Accuracy (Final)
Nguon: [src/core/benchmark/weaviate_stage3_results.json](src/core/benchmark/weaviate_stage3_results.json)

| Metric | Value |
| --- | --- |
| Recall@1 | 3.0 |
| Recall@5 | 8.0 |
| Recall@10 | 9.5 |
| MRR | 0.0472 |
| AvgLatency_ms | 14.47 |
| Errors | 0 |

Nhan xet: Recall@5 < 85% (khong dat KPI, Recall@5 = 8.0). Can dieu tra them (xem Muc 8).

## 4. Recall vs Latency (Tradeoff)
Nguon: [src/core/benchmark/tradeoff.csv](src/core/benchmark/tradeoff.csv)

| top_k | Recall | AvgLatency_ms |
| --- | --- | --- |
| 1 | 3.0 | 16.19 |
| 2 | 3.5 | 15.77 |
| 5 | 8.0 | 15.39 |
| 10 | 9.5 | 15.49 |
| 20 | 15.5 | 14.96 |
| 50 | 24.5 | 15.66 |

## 5. Hybrid vs Dense (Latency)
Nguon: [src/core/benchmark/weaviate_stage3_results.json](src/core/benchmark/weaviate_stage3_results.json)

| Case | Alpha | Latency_ms | ResultCount |
| --- | --- | --- | --- |
| dense_only | - | 16.89 | 5 |
| hybrid_no_filter | 0.25 | 16.73 | 5 |
| hybrid_no_filter | 0.50 | 17.40 | 5 |
| hybrid_no_filter | 0.75 | 15.24 | 5 |
| hybrid_category | 0.25 | 18.32 | 5 |
| hybrid_category | 0.50 | 14.64 | 5 |
| hybrid_category | 0.75 | 25.78 | 5 |
| hybrid_range | 0.25 | 15.35 | 5 |
| hybrid_range | 0.50 | 15.05 | 5 |
| hybrid_range | 0.75 | 13.23 | 5 |
| hybrid_combined | 0.25 | 14.88 | 5 |
| hybrid_combined | 0.50 | 15.30 | 5 |
| hybrid_combined | 0.75 | 15.63 | 5 |

Nhan xet nhanh: `alpha=0.50` nhanh nhat o `hybrid_category`, trong khi `alpha=0.75` nhanh nhat o `hybrid_no_filter` va `hybrid_range`, con `alpha=0.25` nhanh nhat o `hybrid_combined`. Can xac nhan them bang recall hybrid neu muon chot sweet-spot.

## 6. Resource Usage (Docker stats)
Nguon: [docs/weaviate_stage3_results.json](docs/weaviate_stage3_results.json)

- Final run chua co snapshot resource (resources = []).
- Neu can bo sung, chay resource snapshot tu host-run (Docker API).

## 7. Metrics CSV (Latency log)
File [src/core/benchmark/metrics.csv](src/core/benchmark/metrics.csv) co du cac operation toi thieu: `insert`, `search`, `search_hybrid` (Weaviate).

## 8. Checklist Status (Week 3)
- Final accuracy + tradeoff: Hoan thanh (co file [src/core/benchmark/recall.csv](src/core/benchmark/recall.csv) va [src/core/benchmark/tradeoff.csv](src/core/benchmark/tradeoff.csv)).
- Hybrid/filter sweep + alpha sweep: Hoan thanh (co JSON tong hop).
- Resource usage: Chua co snapshot trong final run (resources = []).
- KPI Recall@5 >= 85%: Chua dat (Recall@5 = 8.0).

## 9. Recommendations / Next Steps
- Kiem tra nguyen nhan Recall thap: corpus synthetic + embedding + HNSW ef_search=64 co the chua du.
- Neu team dong y, tang `ef_search` (dong bo ca 3 DB) de cai thien recall, sau do chay lai final.
- Neu muon đo resource trong container, mount Docker socket hoac chay `resource_monitor.get_all_stats()` tu host.

## 10. Output Files
- JSON tong hop (real embedding): [src/core/benchmark/weaviate_stage3_results.json](src/core/benchmark/weaviate_stage3_results.json)
- JSON tong hop (co resource snapshot host): [docs/weaviate_stage3_results.json](docs/weaviate_stage3_results.json)
- Recall table: [src/core/benchmark/recall.csv](src/core/benchmark/recall.csv)
- Tradeoff curve: [src/core/benchmark/tradeoff.csv](src/core/benchmark/tradeoff.csv)
- Metrics log: [src/core/benchmark/metrics.csv](src/core/benchmark/metrics.csv)
