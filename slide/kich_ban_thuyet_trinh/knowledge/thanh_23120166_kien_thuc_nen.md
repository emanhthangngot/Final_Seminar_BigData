# Kiến thức nền cần học - Trần Hữu Kim Thành (23120166)

**Nguồn kịch bản:** `../script/thanh_23120166_kich_ban.md`  
**Vai trò:** Milvus, lifecycle, HA, Developer Experience, kết luận.  
**Mục tiêu học:** Nắm sâu kiến trúc phân tán Milvus, lifecycle insert/flush/load/search, HA, expr filter, số liệu benchmark và edge case vận hành.

## 1. Milvus cần hiểu ở mức nào?

Milvus là Vector Database thiết kế theo hướng **distributed-first**. Thành cần trình bày Milvus như lựa chọn phù hợp khi hệ thống cần:

- Corpus lớn.
- Nhiều query đồng thời.
- Tách compute khỏi storage.
- High Availability.
- Production governance rõ ràng.

Thông điệp chính:

"Milvus nặng hơn Qdrant/Weaviate, nhưng đổi lại có kiến trúc phù hợp scale lớn."

## 2. Kiến trúc Milvus phải giải thích được

### Access Layer - Proxy

Proxy nhận request từ client, validate request, route tới các service bên dưới và aggregate kết quả.

### Coordinator

Các coordinator quản lý metadata và topology:

- RootCoord: DDL, collection, timestamp.
- DataCoord: segment allocation, flush, compaction.
- QueryCoord: phân phối segment cho QueryNode, load balancing.

### Worker Nodes

- DataNode: xử lý ingestion, persist binlog.
- QueryNode: load segment/index vào RAM và phục vụ search.
- IndexNode: build index offline.

### Storage Layer

- etcd: metadata, service discovery, consistency.
- MinIO/S3: object storage cho vector data, scalar data, index files.
- Message Queue: ingestion stream, durability kiểu WAL.

## 3. Lifecycle Milvus cần thuộc

```text
insert() -> Growing Segment -> flush() -> Sealed Segment -> build index -> load() -> search()
```

### Growing Segment

Dữ liệu mới insert, còn đang ghi. Có thể searchable bằng brute-force, nhưng chưa tối ưu bằng full index.

### Flush

Đóng segment đang ghi, persist ra object storage. Flush giúp chuẩn bị build index trên sealed segment.

### Sealed Segment

Segment đã đóng, immutable, có thể build index tối ưu.

### Load

Đưa collection/index vào QueryNode RAM để phục vụ search.

### Bẫy vận hành

Không nên gọi `flush()` quá thường xuyên với batch nhỏ. Điều này tạo nhiều sealed segment nhỏ, gây fragmentation và I/O amplification.

## 4. Knowhere phải giải thích được

Knowhere là lớp execution engine bên dưới Milvus, wrap nhiều thư viện ANN:

- Faiss.
- HNSWlib.
- ScaNN.
- DiskANN.

Ý nghĩa:

- Milvus có thể chọn execution path phù hợp index/hardware.
- Có SIMD/GPU path khi môi trường hỗ trợ.
- Dễ mở rộng index type hơn hệ đơn giản.

## 5. Công thức và số liệu liên quan Milvus

### HNSW config trong app

Milvus wrapper dùng:

```text
metric_type = COSINE
index_type = HNSW
M = 16
efConstruction = 128
ef = 64
```

`M`, `efConstruction`, `ef` có ý nghĩa tương tự phần HNSW:

- M lớn -> graph dày hơn, tốn RAM hơn.
- efConstruction lớn -> build index kỹ hơn, chậm hơn.
- ef search lớn -> recall thường tăng, latency tăng.

### Recall@K

Trong benchmark:

```text
Recall@K = 100 * số query tìm thấy gold CID trong Top-K / số query hợp lệ
```

Milvus snapshot:

```text
Recall@1 = 18.0
Recall@5 = 34.0
Recall@10 = 44.0
MRR = 0.2492
AvgLatency_ms = 4.14
Errors = 0
```

Cách nói:

"Trong snapshot này, Milvus có recall tốt nhất. Nhưng đây là kết quả theo workload synthetic hiện tại, không phải kết luận Milvus luôn thắng."

### MRR

```text
MRR = trung bình của 1 / rank đúng
```

Nếu chunk đúng thường đứng gần đầu, MRR cao. Milvus MRR cao hơn Qdrant/Weaviate nghĩa là gold chunk không chỉ xuất hiện nhiều hơn mà còn thường ở vị trí tốt hơn trong snapshot.

### Filter benchmark overhead

Trong `filter_benchmark.py`, overhead được tính:

```text
overhead = AvgLatency(filter scenario) - AvgLatency(dense_only)
```

Các scenario:

- dense_only.
- equality: `category == "tech"`.
- range: `page >= 3 and page <= 10`.
- combined: `category == "tech" and page >= 3`.
- in_filter: `category in ["tech", "science"]`.

## 6. Milvus wrapper trong app

File: `src/core/db_clients/milvus.py`.

### Schema

Milvus có schema chặt:

- `id`: INT64 primary key, auto_id.
- `content`: VARCHAR.
- `vector`: FLOAT_VECTOR, dim 768.
- `source`: VARCHAR.
- `category`: VARCHAR.
- `page`: INT64.

Khác Qdrant payload linh hoạt và Weaviate auto/schema-driven, Milvus cần field schema rõ trước.

### Insert edge case

Wrapper kiểm tra:

- chunks rỗng -> return `False`.
- chunks/embeddings lệch số lượng -> `ValueError`.
- embedding sai dimension -> `ValueError`.
- `page` không ép được sang int -> `ValueError`.

Insert chia batch:

```text
INSERT_BATCH_SIZE = 2000
```

Lý do: tránh timeout/OOM khi corpus 10K+ chunks.

### Load edge case

Trong `connect()`, Milvus gọi:

```text
self.collection.load()
log_metrics("Milvus", "load", load_ms)
```

Nếu collection lớn, load có thể tạo RAM spike. Đây là một phần chi phí vận hành của Milvus.

### Expr filter edge case

`search_hybrid()` build Milvus boolean expression từ dict:

```text
{"category": "tech"} -> category == "tech"
{"page": {"gte": 3, "lte": 10}} -> page >= 3 and page <= 10
{"category": {"in": ["tech", "science"]}} -> category in ["tech", "science"]
```

Unsupported field -> `ValueError`.

Unsupported operator -> `ValueError`.

Empty IN list -> `ValueError`.

Boolean value cho `page` -> `ValueError`.

String filter value được escape dấu `"` và `\` để tránh expr string hỏng.

## 7. HA cần giải thích được

### etcd quorum

etcd giữ metadata và yêu cầu quorum để đảm bảo consistency. Nếu metadata không nhất quán, collection/segment topology có thể sai.

### Coordinator failover

Coordinator quản lý vai trò hệ thống. Khi một coordinator lỗi, service discovery/failover giúp role được khôi phục.

### QueryNode replica

Nhiều QueryNode có thể phục vụ cùng dữ liệu để tăng availability và throughput.

### Message Queue durability

Ingestion stream đi qua MQ, giúp dữ liệu ghi không chỉ nằm trong request tạm thời. Nó gần với ý tưởng WAL/stream durability.

## 8. Developer Experience và quyết định cuối

Milvus DX khó hơn vì:

- Nhiều service phụ.
- Schema nghiêm ngặt.
- Lifecycle nhiều bước.
- Cần hiểu load/index/flush.
- Debug liên quan cả Milvus, etcd, MinIO, MQ.

Nhưng Milvus đáng dùng khi:

- Dữ liệu lớn.
- Cần HA.
- Cần scale từng role.
- Có đội vận hành đủ năng lực.

## 9. Edge case app/web liên quan phần Thành

### `/resources` có thể không thấy RAM Milvus

Resource monitor cần Docker socket. Nếu Docker socket không có, resource snapshot rỗng. Không nên nói app lỗi; nói đây là giới hạn môi trường demo.

### Milvus search lỗi nếu collection chưa load

Nếu collection chưa `load()`, search có thể lỗi hoặc rất chậm. Wrapper gọi load trong `connect()`, nhưng nếu container restart hoặc collection reset, cần connect/load lại.

### Flush làm latency insert cao

Milvus insert trong wrapper gồm batch insert và `collection.flush()`. Vì vậy insert latency của Milvus có thể gồm chi phí persist ra storage, không chỉ ghi vào memory.

### `search_hybrid()` chưa phải hybrid keyword như Weaviate

Trong app, Milvus `search_hybrid()` là dense vector + expr filter, có thử dùng `AnnSearchRequest + RRFRanker`, nhưng chỉ có một dense request. Nó không phải BM25 native như Weaviate.

Cách nói:

"Milvus phần demo nhấn mạnh expr filter và lifecycle/scale. Hybrid keyword thật cần sparse vector hoặc pipeline bổ sung."

### RRFRanker fallback

Nếu PyMilvus version không hỗ trợ `AnnSearchRequest` hoặc `RRFRanker`, wrapper fallback sang `collection.search(..., expr=expr)`.

Khi demo:

"Nếu môi trường SDK khác nhau, Milvus vẫn có fallback expr filter để giữ luồng demo."

## 10. Q&A Thành cần trả lời được

### Vì sao Milvus recall cao nhất trong snapshot?

Vì với workload hiện tại, index/search path của Milvus truy hồi đúng CID tốt hơn. Tuy nhiên kết quả phụ thuộc corpus, embedding, index state và lifecycle. Không nên kết luận Milvus luôn tốt nhất.

### Vì sao Milvus nặng hơn nhưng vẫn đáng dùng?

Vì kiến trúc distributed giúp scale đúng điểm nghẽn: QueryNode cho search, DataNode cho ingest, IndexNode cho build index, object storage cho dung lượng.

### Khi nào không nên chọn Milvus?

Không nên chọn nếu bài toán nhỏ, team ít người, không cần HA, không muốn vận hành etcd/MinIO/MQ. Khi đó Qdrant hoặc Weaviate thường thực dụng hơn.

### Kết luận cuối cùng nên nói thế nào?

"Qdrant cho filtered RAG gọn và nhanh. Weaviate cho hybrid RAG có keyword + semantic. Milvus cho scale lớn và production phân tán. Lựa chọn đúng phụ thuộc workload, SLA, corpus size và năng lực vận hành."

