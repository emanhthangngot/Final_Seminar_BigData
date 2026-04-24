# Kế Hoạch Cá Nhân - Thành Viên D (Trần Lê Trung Trực)
**Vai trò:** Qdrant Database Specialist
**Kỹ năng bổ trợ:** Rust Performance, Vector Algebra, API Design

## 1. Mục tiêu công việc
Đảm nhận vị trí Quản trị viên Chuyên trách CSDL **Qdrant**. Sản phẩm được phát triển bằng ngôn ngữ Rust tối ưu hoá cực đại bộ nhớ. Thành viên D cung cấp bằng chứng cho slide thuyết trình chứng tỏ Qdrant nhẹ gọn thế nào. Kết quả benchmark sẽ tự động hiển thị trên React Dashboard (trang `/latency`, `/accuracy`, `/tradeoff`, `/dx-score`) thông qua FastAPI backend.

## 2. Phân công chi tiết (Detailed Timeline)

### Tuần 1: Setup Môi trường Qdrant Storage
- Cài đặt Container Qdrant trên local bằng Docker Compose (đã có trong `docker-compose.yml`).
- Định nghĩa rõ Volume persistence tại `./volumes/qdrant_data`.
- Test kết nối Python: `qdrant-client` → `Distance.COSINE`, `dim=768`, không lỗi.

### Tuần 2: Xử lý Payload và API Upload
- Tối ưu chu trình `client.upload_points()`, batch payload/metadata kèm Vector.
- **FAIRNESS BẮT BUỘC:** Trong `connect()` phải pass `INDEX_PARAMS` vào:
  ```python
  hnsw_config=models.HnswConfigDiff(
      m=INDEX_PARAMS["M"],
      ef_construct=INDEX_PARAMS["ef_construction"]
  )
  # search:
  search_params=models.SearchParams(hnsw_ef=INDEX_PARAMS["ef_search"])
  ```
  **KHÔNG hardcode** — fairness là điều kiện tiên quyết.
- **NHIỆM VỤ CỐT LÕI:** Hoàn thiện `search_hybrid()` — build `models.Filter` từ
  dict, pass vào `query_points(query_filter=...)`. Stretch: `prefetch` + sparse
  vectors cho hybrid thực sự.
- **PHỐI HỢP A:** Validate Recall@5 ≥ 90% qua `run_accuracy_benchmark`.
  Qdrant nên đứng đầu hoặc ngang Weaviate về Recall. Kết quả hiển thị tự động trên React `/accuracy`.

### Tuần 3: Giám định Recall@K Performance (Benchmarking)
- Theo sát latency khi có filter metadata lồng vào Graph HNSW.
- Phân tích RAM Usage `ram_at_idle` vs `Peak Ingestion` của Rust.
  → Data này là highlight chính của slide: Qdrant (Rust) RAM thấp nhất.
- Phối hợp chạy `evaluator.py` để chứng minh Payload Filtering của Qdrant
  giúp tăng Recall@1 ở các câu hỏi điều kiện.
- Đảm bảo data trong `metrics.csv`: `Engine=Qdrant`, đủ `timestamp`, `Operation`, `Duration_ms`.

### Tuần 4: Paper Document Analysis
- Viết báo cáo về DX Score: Vì sao Rust SDK của Qdrant thanh lịch, clean.
- Đào sâu: chiến lược Binary/Scalar Quantization → đột phá RAM.
- Trích xuất thị phần Qdrant Github, mô hình kiếm tiền Qdrant Cloud.
- Soạn Architecture Diagram.
- Chuẩn bị Q&A: Tại sao recommend Startup dùng Qdrant? Tại sao Dev Backend thích API Qdrant?

## 3. Chỉ số Kỹ thuật Cần Đạt (KPIs)

- `search_latency_ms` siêu thấp — Qdrant (Rust) nên có median latency thấp nhất trong 3 DB.
- `ram_at_idle` của Qdrant container < Weaviate container khi idle (bằng chứng từ Docker stats).
- Recall@5 ≥ 90% trên synthetic corpus 1K.
- `@time_profiler` decorator áp dụng đúng cho `insert`, `search`, `search_hybrid`.

## 4. Interface Bắt Buộc (`src/core/db_clients/qdrant.py`)

```python
class QdrantWrapper(BaseVectorDB):
    def connect(self):
        # Đọc INDEX_PARAMS từ src.config — KHÔNG hardcode
        # hnsw_config=models.HnswConfigDiff(m=..., ef_construct=...)
        ...

    @time_profiler
    def insert(self, chunks: list, metadata: list):
        # upload_points() với batch
        ...

    @time_profiler
    def search(self, query: list, top_k: int = 5) -> list[str]:
        # query_points() với hnsw_ef từ INDEX_PARAMS
        ...

    @time_profiler
    def search_hybrid(self, query_text: str, query_embedding: list, filters: dict, top_k: int = 5) -> list[str]:
        # models.Filter từ filters dict
        # Stretch: prefetch + sparse vectors
        ...
```
