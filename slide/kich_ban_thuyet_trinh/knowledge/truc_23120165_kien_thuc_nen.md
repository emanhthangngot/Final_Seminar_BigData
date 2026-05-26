# Kiến thức nền cần học - Trần Lê Trung Trực (23120165)

**Nguồn kịch bản:** `../script/truc_23120165_kich_ban.md`  
**Vai trò:** Qdrant, filtered retrieval, so sánh kiến trúc, quantization, demo Qdrant.  
**Mục tiêu học:** Nắm sâu Qdrant, filter strategy, HNSW, payload, quantization và edge case filter trong app.

## 1. Qdrant cần hiểu ở mức nào?

Qdrant là Vector Database viết bằng Rust. Trong bài này, Trực cần trình bày Qdrant như một lựa chọn **gọn, nhanh, ít dependency và mạnh về metadata filtering**.

Điểm chính:

- Single binary, dễ self-host.
- Collection chứa points.
- Mỗi point có vector + payload.
- Payload là metadata: `source`, `category`, `page`, tenant, ACL, timestamp.
- HNSW dùng để approximate nearest neighbor search.
- Payload filter có thể tham gia query path, không chỉ là hậu xử lý.

## 2. HNSW phải giải thích được

HNSW là **Hierarchical Navigable Small World graph**. Có thể nói đơn giản:

- Mỗi vector là một node.
- Các node gần nhau được nối bằng cạnh.
- Search bắt đầu từ một điểm vào, đi dần tới các node gần query hơn.
- HNSW nhanh vì không scan toàn bộ vector.

Hai tham số trong app:

```text
M = 16
ef_construction = 128
ef_search = 64
```

Ý nghĩa:

- `M`: số kết nối tối đa của mỗi node trong graph. M lớn hơn thường tăng recall nhưng tốn RAM/index time.
- `ef_construction`: kích thước candidate list khi build index. Lớn hơn thường index tốt hơn nhưng build chậm hơn.
- `ef_search`: kích thước candidate list khi search. Lớn hơn thường recall cao hơn nhưng latency cao hơn.

Trong wrapper Qdrant, các tham số này lấy từ `INDEX_PARAMS`, không hardcode.

## 3. Filter strategy: phần Trực phải nắm chắc

### Pre-filter

Lọc metadata trước, sau đó search vector trên tập còn lại.

Ưu điểm:

- Đảm bảo kết quả đúng filter.
- Tập search nhỏ hơn nếu filter rất chọn lọc.

Nhược điểm:

- Nếu tập còn lại quá nhỏ hoặc rời rạc, HNSW graph bị thưa.
- Có thể giảm khả năng tìm nearest neighbor tốt.

### Post-filter

Search vector trước, lọc metadata sau.

Ưu điểm:

- Search vector chạy trên graph đầy đủ.

Nhược điểm:

- Nếu nhiều kết quả bị loại, Top-K cuối có thể thiếu.
- Ví dụ lấy top 5, nhưng 4 kết quả sai tenant bị loại, chỉ còn 1 kết quả.

### In-graph filtering / filter-aware traversal

Filter được xét trong lúc duyệt graph.

Ý nghĩa khi thuyết trình:

"Qdrant mạnh không phải chỉ vì có filter, mà vì filter được đưa gần vào đường đi retrieval."

## 4. Công thức liên quan Qdrant và vector search

### Cosine similarity

```text
cosine(q, x) = (q . x) / (||q|| * ||x||)
```

Với Qdrant trong app:

- Distance metric: `COSINE`.
- Vector dimension: `768`.
- Query vector đến từ `nomic-embed-text`.

### Recall khi có filter

Nếu filter đúng, recall không chỉ là "tìm vector gần", mà là "tìm vector gần **trong tập được phép**".

Tư duy cần nói:

```text
valid_results = vector_results ∩ metadata_filter
```

Nếu filter xử lý kém, hệ thống có thể nhanh nhưng trả thiếu evidence hợp lệ.

## 5. Quantization cần học

Quantization là nén vector để giảm RAM và tăng tốc.

### Scalar Quantization

Chuyển float32 sang uint8.

```text
float32 = 4 bytes / dimension
uint8 = 1 byte / dimension
```

Với vector 768 chiều:

```text
float32 memory = 768 * 4 = 3072 bytes ≈ 3 KB/vector
uint8 memory = 768 * 1 = 768 bytes/vector
```

Giảm khoảng 4 lần cho phần raw vector.

### Product Quantization

Chia vector thành nhiều sub-vector, mỗi sub-vector được mã hóa bằng centroid. Có thể tiết kiệm nhiều hơn scalar quantization nhưng cần đo lại recall.

### Binary Quantization

Biến vector thành bit 0/1. So sánh có thể nhanh hơn rất nhiều, nhưng rủi ro mất thông tin cao hơn.

Câu nên nói:

"Quantization không miễn phí. Nó đổi RAM/latency lấy rủi ro giảm Recall@K, nên phải benchmark lại."

## 6. Qdrant wrapper trong app

File liên quan: `src/core/db_clients/qdrant.py`.

### Insert edge case

Wrapper kiểm tra:

- `chunks` rỗng -> warning và return `False`.
- `len(chunks) != len(embeddings)` -> `ValueError`.
- `len(metadata) != len(chunks)` -> `ValueError`.
- embedding sai dimension khác `VECTOR_DIM=768` -> `ValueError`.

Khi thầy hỏi vì sao upload lỗi:

"Có thể input không đồng bộ giữa chunks, embeddings và metadata, hoặc embedding model trả vector không đúng 768 chiều."

### Search edge case

`search()` dùng:

```text
search_params = hnsw_ef = 64
```

Nếu collection chưa tạo hoặc Qdrant container chưa ready, query lỗi. Khi demo, dùng health check trước.

### Filter edge case

`search_hybrid()` của Qdrant trong app thực chất là **dense vector + metadata filter**, chưa phải BM25 hybrid thật.

Filter hỗ trợ:

- Equality: `{"category": "tech"}`
- Range: `{"page": {"gte": 3, "lte": 10}}`
- Boolean match.

Nếu dict range có operator lạ:

```text
{"page": {"between": [3, 10]}}
```

Wrapper raise `ValueError` vì chỉ nhận `gte`, `lte`, `gt`, `lt`.

Cách giải thích:

"Qdrant demo của nhóm tập trung vào payload filtering. Hybrid BM25/sparse thật sự là hướng mở rộng, không phải trọng tâm hiện tại."

## 7. Edge case app/web liên quan phần Trực

### `/hybrid` trả lỗi cho Qdrant

Nguyên nhân thường gặp:

- Filter key không tồn tại trong payload.
- Range operator sai.
- Query embedding sai dimension.
- Qdrant chưa online.

Cách nói:

"Nếu Qdrant lỗi ở hybrid page, cần phân biệt lỗi filter contract với lỗi database. App vẫn có fallback snapshot cho seminar."

### Qdrant latency thấp nhưng recall snapshot thấp

Không nên né số liệu. Cách giải thích:

"Snapshot hiện tại cho thấy Qdrant latency thấp nhưng Recall@10 thấp hơn Milvus. Điều đó không phủ nhận điểm mạnh Qdrant, vì điểm mạnh chính của Qdrant là filtered retrieval và footprint gọn. Với workload khác, đặc biệt filter-heavy, kết quả quyết định có thể khác."

### Async upload `wait=False`

Qdrant wrapper dùng `upload_points(..., wait=False)`. Nếu search ngay sau insert trong môi trường chưa ổn định, có thể có độ trễ nhất định trước khi dữ liệu sẵn sàng.

Cách nói:

"Trong benchmark nghiêm túc cần warm-up hoặc đảm bảo ingest hoàn tất trước khi search."

## 8. Q&A Trực cần trả lời được

### Qdrant khác Weaviate ở filter như thế nào?

Qdrant nhấn mạnh payload filter gần với vector query path. Weaviate mạnh hơn ở hybrid keyword + vector nhờ inverted index/BM25. Nếu bài toán chủ yếu là metadata filter và vận hành gọn, Qdrant là lựa chọn mạnh.

### Qdrant có hybrid search không?

Có thể hỗ trợ dense + sparse/hybrid theo cấu hình, nhưng trong app nhóm đang demo dense vector + payload filter. Vì vậy không nên nói Qdrant trong app có BM25 native như Weaviate.

### Khi nào chọn Qdrant?

Chọn khi:

- Cần triển khai nhẹ.
- Team nhỏ, muốn ít dependency.
- RAG có tenant/ACL/metadata filter.
- Muốn latency thấp và API rõ.

### Khi nào không nên chọn Qdrant?

Nếu yêu cầu chính là native BM25 + vector trong cùng query API, Weaviate phù hợp hơn. Nếu corpus rất lớn, cần HA/distributed production phức tạp, Milvus đáng cân nhắc hơn.

