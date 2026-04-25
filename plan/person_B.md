# Kế Hoạch Cá Nhân - Thành Viên B (Nguyễn Hồ Anh Tuấn)
**Vai trò:** Weaviate Database Specialist
**Kỹ năng bổ trợ:** Docker, Golang Patterns, gRPC

## 1. Mục tiêu công việc
Đóng vai trò Chuyên gia cho mảng quản trị CSDL Vector **Weaviate**. Nhiệm vụ chính là đóng gói thiết lập cài đặt của Weaviate, xây dựng logic Python kết nối đẩy dữ liệu, tìm kiếm thông tin và đo lường trực tiếp tốc độ, hiệu năng của Weaviate. Kết quả đo được sẽ tự động hiển thị trên React Dashboard do A xây dựng thông qua FastAPI `/api/v1/benchmark/*` endpoints.

## 2. Phân công chi tiết (Detailed Timeline)

### Tuần 1: Setup Môi trường Weaviate
- Phân tích và viết file cấu hình cho Weaviate chạy stand-alone bằng Docker Compose (đã có trong `docker-compose.yml`).
- Ưu tiên expose mạng gRPC tốc độ cao, cấu hình port tiêu chuẩn (8080/REST và 50051/gRPC).
- Nghiên cứu Schema trong Weaviate để thiết lập Collection chuẩn `RAGDocument` quy định cụ thể kiểu dữ liệu lưu trữ Text và Vector.
- Test kết nối từ Python: `WeaviateWrapper().connect()` không báo lỗi.

### Tuần 2: Xử lý Tích Hợp & Hybrid Search
- Hoàn thiện `src/core/db_clients/weaviate.py` (skeleton đã có sẵn `connect/insert/search`).
- Tối ưu thao tác Vector hoá qua Batch Data `collection.batch.dynamic()`.
- **FAIRNESS BẮT BUỘC:** Trong `connect()` phải đọc `INDEX_PARAMS` từ `src.config`
  và truyền vào `vector_index_config=Configure.VectorIndex.hnsw(
  max_connections=INDEX_PARAMS["M"], ef_construction=INDEX_PARAMS["ef_construction"], ef=INDEX_PARAMS["ef_search"])`.
  Không được hardcode. Đây là điều kiện tiên quyết để Recall của Weaviate so sánh
  được với Qdrant/Milvus trên cùng biểu đồ React.
- **NHIỆM VỤ CỐT LÕI:** Hoàn thiện `search_hybrid()` tại `weaviate.py` dùng
  `collection.query.hybrid(query=query_text, vector=query_embedding, alpha=...)`
  + `weaviate.classes.query.Filter`. Thử nghiệm `alpha` để tìm sweet spot.
- **PHỐI HỢP A:** Sau khi `connect()` dùng đúng INDEX_PARAMS, chạy
  `run_accuracy_benchmark()` để validate Recall@5 ≥ ~90% trên synthetic corpus.
  Kết quả sẽ tự động hiển thị trên trang `/accuracy` của React Dashboard.

### Tuần 3: Giám sát đo lường (Benchmarking Analytics)
- Giám sát `weaviate_ingest_ms` và RAM tĩnh/động (từ `resource_monitor.get_all_stats`).
- Chạy `tradeoff.run_tradeoff_sweep` do A viết → lấy curve Recall vs Latency của Weaviate.
  Kết quả hiển thị tự động trên trang `/tradeoff` của React Dashboard.
- Phân tích Trade-off giữa Hybrid Search vs Dense-only (thay đổi `alpha` và `Filter`
  phức tạp dần). Báo cáo cho A để add vào tab `/hybrid`.
- Kiểm tra dữ liệu `metrics.csv` có đủ fields: `timestamp`, `Engine`, `Operation`, `Duration_ms`.

### Tuần 4: Viết Report Academic Khoa Học
- Tập trung sâu vào việc phân tích: Kiến trúc Modular của Weaviate đã hỗ trợ thuật toán Hybrid Search ngầm định (BM25 + Vector) xuất sắc ra sao so với việc phải code thủ công BM25 trên 2 hệ DB còn lại.
- Trình bày một Architecture Diagram minh hoạ khối dịch vụ Weaviate.
- Chuẩn bị nội dung kiến thức để Q&A: Hệ điều hành bộ nhớ Garbage Collection trong Go ảnh hưởng gì đến tốc độ truy vấn ở Weaviate?

## 3. Chỉ số Kỹ thuật Cần Đạt (KPIs)

- Kết nối thành công hệ thống Python qua gRPC không báo lỗi time-out khi upload dữ liệu lớn.
- `latency_ms` insert và search xuất hiện đúng trong `/api/v1/metrics` → hiển thị trên `/latency` page.
- Recall@5 ≥ 85% trên synthetic corpus 1K (nếu < 85%, kiểm tra lại `vectorizer_config=None`).
- Bảo toàn dữ liệu bằng Docker Volumes tại `./volumes/weaviate_data`.

## 4. Interface Bắt Buộc (`src/core/db_clients/weaviate.py`)

```python
class WeaviateWrapper(BaseVectorDB):
    def connect(self):
        # Đọc INDEX_PARAMS từ src.config — KHÔNG hardcode
        ...

    @time_profiler
    def insert(self, chunks: list, metadata: list):
        # batch.dynamic() với chunks/embeddings
        ...

    @time_profiler
    def search(self, query: list, top_k: int = 5) -> list[str]:
        # vector search, trả về list[str] nội dung chunk
        ...

    @time_profiler
    def search_hybrid(self, query_text: str, query_embedding: list, filters: dict, top_k: int = 5) -> list[str]:
        # hybrid(query=query_text, vector=query_embedding, alpha=0.5)
        # + Filter từ filters dict
        ...
```
