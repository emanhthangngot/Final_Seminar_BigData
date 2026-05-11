# Phân Tích Kỹ Thuật: Milvus trong Hệ Thống RAG Benchmark
**Author:** Trần Hữu Kim Thành (Person C — Milvus Specialist)  
**Phase:** Stage 3 — Benchmark & Analysis  
**Cập nhật:** 2026-05-11 (Smoke Test: corpus=1000, queries=50, MockEmbedder SHA-256 stable)

---

## 1. Đặc Thù Kiến Trúc Milvus

### 1.1 Collection Schema Chặt Chẽ

Không như Qdrant hay Weaviate cho phép khai báo schema linh hoạt hoặc tự suy kiểu dữ liệu,
**Milvus yêu cầu khai báo đầy đủ schema trước khi insert bất kỳ dữ liệu nào**.
Trong project này, schema được định nghĩa gồm **6 trường**:

| Field | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `id` | `INT64` (primary, auto_id) | Khoá chính tự tăng |
| `content` | `VARCHAR(65535)` | Nội dung text chunk |
| `vector` | `FLOAT_VECTOR(768)` | Embedding nomic-embed-text |
| `source` | `VARCHAR(1024)` | Tên file nguồn (PDF, URL...) |
| `category` | `VARCHAR(256)` | Metadata để lọc Boolean |
| `page` | `INT64` | Số trang để lọc range |

**Ý nghĩa:** Schema chặt chẽ giúp Milvus tối ưu hoá lưu trữ cột (columnar storage)
và đánh index scalar song song với index vector — điều này là lợi thế ở production scale.
Tuy nhiên, với prototype/seminar, nó tăng thêm overhead setup so với Qdrant (schema-free)
và Weaviate (auto-schema).

### 1.2 Lifecycle Ba Bước Bắt Buộc

Đây là khác biệt quan trọng nhất của Milvus so với hai engine còn lại:

```
insert(data) → flush() → load() → search()
```

Chi phí thực tế đo được (corpus=1000 chunks, batch=500):

| Bước | Operation trong metrics.csv | Thời gian thực đo |
|---|---|---|
| `insert()` batch x2 | `insert` | avg **1460 ms** (bao gồm 2 batches) |
| `flush()` | `flush` | **2529 ms** |
| `load()` | `load` | avg **343 ms** (37–648 ms tuỳ trạng thái) |
| `search()` | `search` | avg **6.88 ms** / query |

**Nếu bỏ qua `load()`** → `search()` sẽ raise lỗi `collection not loaded`.
Trong wrapper (`milvus.py`), `load()` được gọi tự động sau `connect()`.

**Nhận xét:** `flush()` là bước đắt nhất (2.5 giây) vì phải persist toàn bộ buffer
ra MinIO object storage. Đây là chi phí ẩn của kiến trúc distributed.

### 1.3 RAM Spike khi load() — Kết Quả Giám Sát Thực Tế

RAM được đo bằng `psutil` (hàm `_get_process_ram_mb()`) trước và sau `load()`:

| Thời điểm | RAM (MB) |
|---|---|
| Trước `load()` (idle) | ~397 MB |
| Sau `load()` (collection đã load) | ~398 MB |
| RAM spike | **~+1 MB** (corpus nhỏ 1K) |
| RAM limit (docker-compose) | 2048 MB |

> **Ghi chú:** Với corpus lớn hơn (10K+), RAM spike sẽ rõ rệt hơn vì Milvus load
> toàn bộ index HNSW vào RAM. Với corpus 1K, index rất nhỏ nên spike không đáng kể.

### 1.4 Resource Footprint: Standalone ≠ Đơn Giản

Dù là chế độ "Standalone", Milvus vẫn kéo theo **3 container**:

| Container | Vai trò | RAM (idle) |
|---|---|---|
| `seminar_milvus` | Query engine + HNSW index | ~379–398 MB |
| `seminar_milvus_etcd` | Distributed metadata log | (cùng pod) |
| `seminar_milvus_minio` | Object storage cho vector data | (cùng pod) |
| **Tổng Milvus** | | **~398 MB / 2048 MB limit** |

So sánh: Qdrant chỉ dùng **~79 MB** (1 container) → Milvus **~5x RAM hơn Qdrant**.
Đây là trade-off cần nêu rõ trong báo cáo.

---

## 2. Nhận Xét Filter / Developer Experience (DX)

### 2.1 Điểm Mạnh: expr Syntax Giống SQL

Milvus sử dụng cú pháp boolean expression (`expr`) để lọc dữ liệu metadata:

```python
# Equality filter
'category == "tech"'

# Range filter
'page >= 3 and page <= 10'

# Combined filter
'category == "tech" and page >= 3'

# IN filter
'category in ["tech", "science"]'
```

Đối với sinh viên ngành Big Data có nền SQL, cú pháp này **trực quan và dễ giải thích
trong báo cáo** hơn so với Weaviate (GraphQL-style) hay Qdrant (JSON nested filter).

### 2.2 Điểm Khó: Lifecycle Phức Tạp Hơn

| Khía cạnh | Milvus | Qdrant |
|---|---|---|
| Setup schema | Phải khai báo đầy đủ | Payload tự do (schema-free) |
| Sau insert | Phải `flush()` + `load()` | Sẵn sàng query ngay |
| Chi phí flush | ~2529 ms (corpus 1K) | Không cần bước này |
| Debug lỗi | Stack trace PyMilvus phức tạp | Error message rõ ràng hơn |
| Infra | 3 containers (etcd + MinIO) | 1 container |

### 2.3 Hiệu Năng Filter Latency — Kết Quả Thực Đo

*Chạy với 20 query vectors, top_k=5, corpus 1000 chunks*

| Filter Scenario | AvgLatency_ms | Min_ms | Max_ms | Overhead vs baseline |
|---|---|---|---|---|
| `dense_only` (baseline) | 6.68 ms | 6.18 | 7.19 | — |
| `equality` (category=="tech") | 5.24 ms | 5.10 | 5.38 | **−1.44 ms** |
| `range` (page>=3 and page<=10) | 6.27 ms | 3.04 | 9.50 | +0.41 ms |
| `combined` (category + page) | 5.66 ms | 3.41 | 7.91 | −1.02 ms |
| `in_filter` (category in [...]) | 4.77 ms | 3.12 | 6.42 | **−1.91 ms** |

**Nhận xét thú vị:** Trái với kỳ vọng, các filter scenario có latency *thấp hơn hoặc
tương đương* dense_only baseline. Nguyên nhân: `expr` filter giúp Milvus **loại bỏ
candidate sớm** trong HNSW graph traversal (pre-filter), giảm số lượng distance
computation. Đây là điểm mạnh đáng chú ý của Milvus so với các engine post-filter.

---

## 3. Kết Quả Benchmark

### 3.1 Accuracy (Recall@K, MRR)

*MockEmbedder — SHA-256 stable hash, corpus=1000, queries=50*  
*Nguồn: `recall.csv` (chạy 2026-05-07)*

| Engine | Recall@1 | Recall@5 | Recall@10 | MRR | AvgLatency_ms | Errors |
|---|---|---|---|---|---|---|
| Milvus | 0.0% | 0.0% | 0.0% | 0.0000 | **6.34 ms** | 0 |

> **Quan trọng:** Recall = 0% là **hành vi đúng** với MockEmbedder.
> MockEmbedder sinh vector ngẫu nhiên từ hash của text — một query substring (14 từ)
> sẽ cho vector **hoàn toàn khác** với chunk gốc, không có quan hệ ngữ nghĩa.
> Pipeline hoạt động đúng (0 errors). Với Ollama embedder (nomic-embed-text),
> Recall@5 dự kiến đạt ≥80%.

> **Định nghĩa AvgLatency:** Chỉ đo thời gian gọi `db.search()` (ANN query).
> Không bao gồm embed, insert, flush, hay load. Xem mục 3.3 cho chi phí vận hành đầy đủ.

**Phân tích:**
- AvgLatency `search()` = **6.34 ms** — đây là thời gian thuần ANN query
- 0 errors — Milvus hoạt động ổn định với corpus 1K
- Collection lifecycle (insert→flush→load) hoạt động chính xác, Index Ready sau `connect()`

### 3.2 Recall vs Latency Tradeoff Sweep

*6 điểm top_k, corpus=1000, queries=50, MockEmbedder*  
*Nguồn: `tradeoff.csv` (chạy 2026-05-07)*

| top_k | Recall (%) | AvgLatency_ms | Delta Latency |
|---|---|---|---|
| 1 | 0.0 | 6.86 | — |
| 2 | 0.0 | 7.82 | +0.96 ms |
| 5 | 0.0 | 10.67 | +2.85 ms |
| 10 | 0.0 | 12.96 | +2.29 ms |
| 20 | 0.0 | 8.25 | −4.71 ms |
| 50 | 4.0 | 6.52 | −1.73 ms |

> **Lưu ý:** Recall = 0% ở tất cả top_k ≤ 20 là đúng với MockEmbedder (xem mục 3.1).
> Recall tăng nhẹ lên 4% ở top_k=50 chỉ do may mắn ngẫu nhiên.

**Nhận xét:** Latency tăng từ 6.86 ms (top_k=1) lên 12.96 ms (top_k=10), sau đó
giảm nhẹ ở top_k=20 và 50. Điều này phản ánh behavior của HNSW: scan effort tăng
theo k nhưng không tuyến tính. Sweet spot thực tế: **top_k=5** (latency 10.67 ms)
cho balance tốt giữa recall và tốc độ khi dùng real embedder.

### 3.3 Chi Phí Vận Hành (Operations Cost)

*Nguồn: `metrics.csv` (chạy 2026-05-07) — chỉ tính các entry ngày 2026-05-07*

| Operation | Count | AvgLatency_ms | Min | Max | Ghi chú |
|---|---|---|---|---|---|
| `insert` | 2 lần | 2805.30 ms | 2785 | 2825 | Batch insert 1000 chunks (2 batches × 500) |
| `flush` | 1 lần | 2529.87 ms | — | — | Persist buffer ra MinIO — **bước đắt nhất** |
| `load` | 2 lần | 343.09 ms | 38 | 648 | Load HNSW index vào RAM |
| `search` | 700 calls | 7.68 ms | 3.00 | 603.58 | ANN vector search (P95 outlier included) |
| `search_hybrid` | 200 calls | 5.16 ms | 1.90 | 50.93 | Dense + expr filter |

**Tổng chi phí khởi tạo 1 lần benchmark:** insert(2805) + flush(2530) + load(343) = **~5678 ms**.
Đây là overhead của Milvus so với Qdrant (upsert → ready ngay, không cần flush/load).

---

## 4. Kết Luận Thực Dụng

### Khi nào nên dùng Milvus?

✅ **Phù hợp khi:**
- Corpus **> 10 triệu vectors** (kiến trúc distributed scale tốt)
- Cần **boolean filter phức tạp** kiểu SQL (expr rất mạnh)
- Môi trường **production enterprise** với team DevOps sẵn sàng
- Cần **schema rõ ràng** cho data governance

⚠️ **Nên cân nhắc khi:**
- Máy local có **< 4GB RAM trống** (3 container nặng: ~398 MB + etcd + MinIO)
- Team nhỏ, cần **time-to-prototype nhanh** (Qdrant DX tốt hơn, RAM ít hơn 5×)
- **Seminar/demo** ngắn hạn không cần enterprise feature

### Trade-off Summary cho Project này

| Tiêu chí | Milvus | Qdrant |
|---|---|---|
| Recall@5 (mock) | 0.0% ¹ | N/A |
| Search latency avg | 7.68 ms (`search`) | N/A |
| RAM idle | ~398 MB | ~79 MB |
| Khởi tạo (insert+flush+load) | ~5678 ms | ~insert only |
| Filter syntax | SQL-like expr | JSON object |
| Setup complexity | Cao (3 services) | Thấp (1 service) |
| DX Score | 3/5 | 5/5 |

¹ *Recall = 0% là đúng với MockEmbedder. Xem mục 3.1.*

---

## 5. Bàn Giao Cho Person A (Dashboard Integration)

### Nhận xét ngắn cho từng tab frontend:

- **`/accuracy`**: Recall@5 của Milvus = **0.0% (mock)** — đây là hành vi đúng,
  MockEmbedder sinh vector không liên quan ngữ nghĩa; pipeline 0 errors, hoạt động ổn định.
  Với Ollama embedder (nomic-embed-text), dự kiến Recall@5 ≥80%.
  AvgLatency `search()` = **6.34 ms** (chỉ đo ANN query, không bao gồm embed/insert/flush/load).

- **`/latency`**: Search latency avg **7.68 ms** (search) và **5.16 ms** (search_hybrid).
  Khởi tạo nặng: insert ~2805ms + flush ~2530ms + load ~343ms = **~5.7 giây tổng**.
  Milvus chậm hơn Qdrant ở khởi tạo do overhead flush/load.

- **`/tradeoff`**: Latency tăng từ 6.86 ms (top_k=1) lên 12.96 ms (top_k=10), sau đó
  biến động nhẹ. Recall = 0% do MockEmbedder (xem mục 3.1). Sweet spot: **top_k=5**.

- **`/hybrid`**: `expr` filter có latency **thấp hơn** dense-only baseline (6.68 ms):
  equality 5.24ms (−1.44ms), in_filter 4.77ms (−1.91ms). Pre-filter trong HNSW graph
  giúp giảm candidate trước khi tính distance. 0 errors trong 5 scenarios.

- **`/dx-score`**: Milvus DX phức tạp (3 services, schema declare upfront,
  insert→flush→load lifecycle, ~5.7s khởi tạo). Đổi lại: SQL-like expr filter,
  schema rõ ràng, tốt cho production scale. Recommend cho enterprise, không phải prototyping.

---

## 6. Files Đã Sinh Ra

| File | Nội dung |
|---|---|
| `src/core/benchmark/recall.csv` | Recall@1/5/10, MRR, AvgLatency, Errors cho Milvus |
| `src/core/benchmark/tradeoff.csv` | 6 điểm top_k cho Milvus (Recall vs Latency curve) |
| `src/core/benchmark/metrics.csv` | insert(11), flush(1), load(2), search(1033), search_hybrid(209+) |

*Benchmark chạy 2026-05-07 với MockEmbedder (SHA-256 stable hash từ 2026-05-11).  
Recall = 0% là đúng với MockEmbedder. Chạy lại khi Ollama sẵn sàng để có Recall chính xác.*
