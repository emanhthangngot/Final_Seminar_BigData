# Weaviate Stage 3 Report (Smoke)

## 1. Scope
- Run smoke benchmark (corpus_size=1000, num_queries=50) cho Weaviate.
- Sinh du lieu output: recall, tradeoff, metrics, va JSON tong hop.
- Hybrid sweep voi `alpha` = 0.25 / 0.50 / 0.75 va filter phuc tap dan.

## 2. Environment + Fairness
- HNSW params tu `INDEX_PARAMS` (M=16, ef_construction=128, ef_search=64, metric=cosine).
- Embedding model: `nomic-embed-text` qua Ollama (MOCK_MODE=false) khi chay trong container backend.
- Resource snapshot lay tu host-run (Docker API) do container backend khong co Docker socket.

## 3. Accuracy (Smoke)
Nguon: [src/core/benchmark/weaviate_stage3_results.json](src/core/benchmark/weaviate_stage3_results.json)

| Metric | Value |
| --- | --- |
| Recall@1 | 14.0 |
| Recall@5 | 38.0 |
| Recall@10 | 44.0 |
| MRR | 0.23 |
| AvgLatency_ms | 14.2 |
| Errors | 0 |

Nhan xet: Recall@5 < 85% (khong dat KPI). Can dieu tra them (xem Muc 8).

## 4. Recall vs Latency (Tradeoff)
Nguon: [src/core/benchmark/tradeoff.csv](src/core/benchmark/tradeoff.csv)

| top_k | Recall | AvgLatency_ms |
| --- | --- | --- |
| 1 | 14.0 | 14.17 |
| 2 | 22.0 | 14.04 |
| 5 | 38.0 | 14.10 |
| 10 | 44.0 | 15.17 |
| 20 | 60.0 | 15.54 |
| 50 | 82.0 | 16.09 |

## 5. Hybrid vs Dense (Latency)
Nguon: [src/core/benchmark/weaviate_stage3_results.json](src/core/benchmark/weaviate_stage3_results.json)

| Case | Alpha | Latency_ms | ResultCount |
| --- | --- | --- | --- |
| dense_only | - | 15.11 | 5 |
| hybrid_no_filter | 0.25 | 17.87 | 5 |
| hybrid_no_filter | 0.50 | 17.42 | 5 |
| hybrid_no_filter | 0.75 | 17.52 | 5 |
| hybrid_category | 0.25 | 17.87 | 5 |
| hybrid_category | 0.50 | 16.30 | 5 |
| hybrid_category | 0.75 | 17.05 | 5 |
| hybrid_range | 0.25 | 16.85 | 5 |
| hybrid_range | 0.50 | 17.24 | 5 |
| hybrid_range | 0.75 | 16.93 | 5 |
| hybrid_combined | 0.25 | 16.85 | 5 |
| hybrid_combined | 0.50 | 16.98 | 5 |
| hybrid_combined | 0.75 | 17.10 | 5 |

Nhan xet nhanh: `alpha=0.50` co xu huong on dinh (latency thap nhat o nhom `hybrid_category`, va on dinh o cac filter khac). Can xac nhan them bang recall hybrid neu muon chot sweet-spot.

## 6. Resource Usage (Docker stats)
Nguon: [docs/weaviate_stage3_results.json](docs/weaviate_stage3_results.json)

- Idle RAM (truoc benchmark): ~170.16 - 170.65 MB
- Sau ingest: ~171.25 - 171.45 MB
- Sau tradeoff: ~171.36 - 171.61 MB
- Hybrid sweep peak: ~173.45 MB
- CPU snapshot: ~0.6% - 2.2%

Luu y: Resource monitor trong container backend khong truy cap duoc Docker socket, nen snapshot duoc lay tu host-run.

## 7. Metrics CSV (Latency log)
File [src/core/benchmark/metrics.csv](src/core/benchmark/metrics.csv) co du cac operation toi thieu: `insert`, `search`, `search_hybrid` (Weaviate).

## 8. Checklist Status (Week 3)
- Smoke accuracy + tradeoff: Hoan thanh (co file [src/core/benchmark/recall.csv](src/core/benchmark/recall.csv) va [src/core/benchmark/tradeoff.csv](src/core/benchmark/tradeoff.csv)).
- Hybrid/filter sweep + alpha sweep: Hoan thanh (co JSON tong hop).
- Resource usage: Co snapshot (host-run). Can bo sung truong hop container neu muon tu dong.
- KPI Recall@5 >= 85%: Chua dat (Recall@5 = 38%).

## 9. Recommendations / Next Steps
- Kiem tra nguyen nhan Recall thap: corpus synthetic + embedding + HNSW ef_search=64 co the chua du.
- Neu team dong y, tang `ef_search` (dong bo ca 3 DB) de cai thien recall, sau do chay lai smoke.
- Neu muon đo resource trong container, mount Docker socket hoac chay `resource_monitor.get_all_stats()` tu host.

## 10. Output Files
- JSON tong hop (real embedding): [src/core/benchmark/weaviate_stage3_results.json](src/core/benchmark/weaviate_stage3_results.json)
- JSON tong hop (co resource snapshot host): [docs/weaviate_stage3_results.json](docs/weaviate_stage3_results.json)
- Recall table: [src/core/benchmark/recall.csv](src/core/benchmark/recall.csv)
- Tradeoff curve: [src/core/benchmark/tradeoff.csv](src/core/benchmark/tradeoff.csv)
- Metrics log: [src/core/benchmark/metrics.csv](src/core/benchmark/metrics.csv)
