# Kiến thức nền cần học - Nguyễn Hồ Anh Tuấn (23120185)

**Nguồn kịch bản:** `../script/tuan_23120185_kich_ban.md`  
**Vai trò:** Weaviate, Hybrid Search, RRF, benchmark methodology/tradeoff, demo Weaviate.  
**Mục tiêu học:** Nắm chắc hybrid retrieval, BM25/vector fusion, alpha, RRF, filter API và cách giải thích khi số liệu dense benchmark chưa phản ánh hết lợi thế Weaviate.

## 1. Weaviate cần hiểu ở mức nào?

Weaviate là Vector Database có định hướng **AI-native/RAG-native**. Trong bài này, Tuấn cần trình bày Weaviate như công cụ mạnh khi app cần kết hợp:

- Semantic vector search.
- Keyword/BM25 search.
- Metadata filter.
- Schema rõ cho object/document.

Trong slide, Weaviate có ba chỉ mục cùng tồn tại:

- Object Store: lưu object và metadata.
- HNSW Vector Index: tìm gần nghĩa.
- Inverted Index: BM25, keyword search và filter.

## 2. BM25 cần giải thích vừa đủ

BM25 là thuật toán keyword ranking dựa trên:

- Term frequency: từ xuất hiện nhiều trong document thì liên quan hơn.
- Inverse document frequency: từ hiếm có trọng số cao hơn từ phổ biến.
- Document length normalization: tránh document dài thắng chỉ vì có nhiều từ.

Công thức tổng quát:

```text
BM25(d, q) = sum IDF(t) * ((tf(t,d) * (k1 + 1)) / (tf(t,d) + k1 * (1 - b + b * |d| / avgdl)))
```

Không cần trình bày công thức dài trên slide, nhưng cần hiểu:

- BM25 giỏi với tên riêng, mã lỗi, mã sản phẩm.
- Vector giỏi với paraphrase và đồng nghĩa.

Ví dụ:

- Query: "E042 payment timeout"
- BM25 tốt vì `E042` là exact token quan trọng.

## 3. Vector search và alpha trong Hybrid Search

Weaviate `search_hybrid()` trong app gọi:

```text
collection.query.hybrid(
  query=query_text,
  vector=query_embedding,
  alpha=hybrid_alpha,
  limit=top_k,
  filters=...
)
```

Alpha:

```text
alpha = 0.0 -> BM25 only
alpha = 0.5 -> cân bằng
alpha = 1.0 -> vector only
```

Cách nói:

"Alpha là nút chỉnh giữa lexical signal và semantic signal. Với tài liệu kỹ thuật, alpha không nên cố định theo cảm tính; cần tune trên query set thật."

Edge case trong code:

- Nếu alpha không phải số -> dùng default `0.5`.
- Nếu alpha ngoài `[0, 1]` -> warning và dùng default `0.5`.

## 4. RRF phải giải thích được

RRF là **Reciprocal Rank Fusion**, dùng để hợp nhất nhiều bảng xếp hạng.

Công thức:

```text
score(d) = sum_i 1 / (k + rank_i(d))
```

Trong đó:

- `d`: document.
- `i`: nguồn ranking, ví dụ BM25 và vector.
- `rank_i(d)`: vị trí của document trong ranking thứ i.
- `k`: hằng số làm mượt, thường dùng 60 trong nhiều hệ thống.

Ví dụ với `k=60`:

```text
d1: BM25 rank 1, Vector rank 5
score(d1) = 1/(60+1) + 1/(60+5) = 0.01639 + 0.01538 = 0.03177

d2: BM25 rank 8, Vector rank 1
score(d2) = 1/(60+8) + 1/(60+1) = 0.01471 + 0.01639 = 0.03110
```

Ý nghĩa:

- Document đứng cao ở một nguồn vẫn có cơ hội lên cao.
- Không cần chuẩn hóa raw score BM25 và cosine similarity.

## 5. Weaviate wrapper trong app

File liên quan: `src/core/db_clients/weaviate.py`.

### Schema

Collection: `RAGDocument`.

Properties:

- `content`: text chính.
- `source`: nguồn PDF.
- `chunk_id`: ID chunk.
- `category`: metadata category.
- `page`: số trang.

Weaviate trong app dùng:

```text
vectorizer_config = none
```

Nghĩa là app tự đưa embedding vào, để công bằng với Qdrant và Milvus. Nếu để Weaviate tự vectorize, benchmark sẽ không còn cùng embedding model.

### Insert edge case

Wrapper kiểm tra:

- chunks rỗng -> warning và return `False`.
- chunks/embeddings lệch số lượng -> `ValueError`.
- vector sai `VECTOR_DIM=768` -> `ValueError`.
- metadata thừa key -> bỏ qua nếu key không có trong schema.

Điều cần nói:

"Weaviate schema giúp dữ liệu rõ ràng, nhưng cũng yêu cầu metadata đi theo property đã khai báo."

### Filter edge case

Weaviate filter hỗ trợ:

- Equality: `{"category": "tech"}`
- Range: `{"page": {"gte": 3, "lte": 10}}`
- IN: `{"category": ["tech", "science"]}`
- Một số operator: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`.

Nếu filter key không có trong schema, wrapper warning và bỏ qua key đó. Nếu `page` không ép được sang int, wrapper bỏ qua giá trị đó.

## 6. Công thức benchmark/tradeoff Tuấn cần giải thích

### Recall trong tradeoff

Trong `tradeoff.py`:

```text
Recall(top_k) = 100 * hits / num_queries
```

Một hit xảy ra khi `pair.chunk_id` nằm trong `retrieved_ids`.

### AvgLatency trong tradeoff

```text
AvgLatency_ms = sum(search latency for each query) / number of successful searches
```

Latency chỉ đo `db.search(...)`, không đo embedding query.

### Pareto Frontier

Một điểm A Pareto-better hơn B nếu:

- A có recall >= B
- A có latency <= B
- Và ít nhất một chỉ số tốt hơn.

Cách nói:

"Điểm tốt nằm cao và lệch trái: recall cao, latency thấp. Nhưng chọn điểm nào còn phụ thuộc SLA."

## 7. Số liệu Tuấn cần thuộc

Tradeoff snapshot:

| Engine | top_k=1 | top_k=10 | top_k=50 |
|---|---:|---:|---:|
| Milvus | 18.0 / 3.65 ms | 44.0 / 3.88 ms | 80.0 / 4.17 ms |
| Qdrant | 3.0 / 4.57 ms | 9.5 / 4.87 ms | 27.0 / 5.82 ms |
| Weaviate | 3.0 / 16.19 ms | 9.5 / 15.49 ms | 24.5 / 15.66 ms |

Cách giải thích Weaviate:

"Snapshot này chủ yếu phản ánh dense retrieval path. Weaviate không thắng latency/recall trong snapshot, nhưng lợi thế kiến trúc nằm ở hybrid keyword + semantic, đặc biệt khi query chứa mã lỗi, tên riêng hoặc thuật ngữ hiếm."

## 8. Edge case app/web liên quan phần Tuấn

### `/hybrid` có alpha nhưng backend model chưa truyền alpha từ frontend

Frontend hiện gọi:

```text
runHybridBenchmark(query, filters, topK)
```

Backend service có tham số `alpha`, nhưng frontend API hiện không gửi alpha trong hàm này. Nếu UI chưa có control alpha hoặc chưa wire đủ, demo alpha nên giải thích về mặt kiến thức, không khẳng định đang live-tune alpha nếu UI không gửi.

### Weaviate latency cao trong snapshot

Nguyên nhân có thể:

- Hybrid/dense path khác nhau.
- SDK overhead.
- Collection/schema state.
- Docker warm-up.
- Snapshot không phải workload keyword-heavy.

Cách nói:

"Weaviate cần được đánh giá ở workload đúng: tài liệu kỹ thuật có keyword quan trọng. Dense-only benchmark không thể hiện toàn bộ lợi thế."

### Filter bị bỏ qua nếu key sai schema

Nếu người demo nhập filter key không tồn tại, wrapper warning và bỏ qua key. Kết quả có thể rộng hơn mong đợi.

Cách xử lý:

- Dùng filter chắc chắn có: `category`, `page`, `source`.
- Không dùng key như `tenant` nếu data benchmark chưa có field đó.

### CSV fallback normalize recall

Frontend chia recall từ `44.0` thành `0.44` để chart. Nếu tooltip/chart hiển thị tỷ lệ, cần nói đúng đơn vị.

## 9. Q&A Tuấn cần trả lời được

### Vì sao Weaviate mạnh ở Hybrid Search?

Vì Weaviate có inverted index/BM25 và HNSW vector index trong cùng engine. Nó không cần ghép một search engine ngoài với vector database để có keyword + semantic.

### RRF khác cộng score trực tiếp thế nào?

RRF dùng rank position, không dùng raw score. Vì BM25 score và cosine similarity khác thang đo, dùng rank giúp fusion ổn định hơn.

### Khi nào chọn Weaviate?

Chọn khi:

- Tài liệu có mã lỗi, tên riêng, thuật ngữ.
- Cần keyword + semantic.
- Muốn schema rõ và API gần với RAG workflow.
- Team ưu tiên developer experience.

### Khi nào không chọn Weaviate?

Nếu chỉ cần dense vector latency thấp và deployment gọn, Qdrant có thể hợp hơn. Nếu cần distributed scale rất lớn và HA, Milvus đáng cân nhắc hơn.

