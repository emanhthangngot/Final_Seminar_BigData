# Kế Hoạch Cá Nhân - Thành Viên B (Nguyễn Hồ Anh Tuấn)
**Vai trò:** Weaviate Database Specialist
**Kỹ năng bổ trợ:** Docker, Golang Patterns, gRPC

## 1. Mục tiêu công việc
Đóng vai trò Chuyên gia cho mảng quản trị CSDL Vector **Weaviate**. Nhiệm vụ chính là đóng gói thiết lập cài đặt của Weaviate, xây dựng logic Python kết nối đẩy dữ liệu, tìm kiếm thông tin và đo lường trực tiếp tốc độ, hiệu năng của Weaviate trong bối cảnh kiến trúc RAG theo đúng yêu cầu Master Plan.

## 2. Phân công chi tiết (Detailed Timeline)

### Tuần 1: Setup Môi trường
- Phân tích và viết file cấu hình cho Weaviate chạy stand-alone bằng Docker Compose, ưu tiên expose mạng gRPC tốc độ cao, đồng thời cấu hình port tiêu chuẩn (ví dụ 8080/REST và 50051/gRPC) để tránh đụng độ.
- Nghiên cứu Schema trong Weaviate để thiết lập Collection chuẩn `RAGDocument` quy định cụ thể kiểu dữ liệu lưu trữ Text và Vector.

### Tuần 2: Xử lý Tích Hợp & Hybrid Search
- Hoàn thiện `src/core/db_clients/weaviate.py` (skeleton đã có sẵn `connect/insert/search`).
- Tối ưu thao tác Vector hoá qua Batch Data `collection.batch.dynamic()`.
- **FAIRNESS BẮT BUỘC:** Trong `connect()` phải đọc `INDEX_PARAMS` từ `src.config`
  và truyền vào `vector_index_config=Configure.VectorIndex.hnsw(
  max_connections=INDEX_PARAMS["M"], ef_construction=INDEX_PARAMS["ef_construction"], ef=INDEX_PARAMS["ef_search"])`.
  Không được hardcode. Đây là điều kiện tiên quyết để Recall của Weaviate so sánh
  được với Qdrant/Milvus trên cùng biểu đồ.
- **NHIỆM VỤ CỐT LÕI:** Hoàn thiện `search_hybrid()` tại `weaviate.py` dùng
  `collection.query.hybrid(query=query_text, vector=query_embedding, alpha=...)`
  + `weaviate.classes.query.Filter`. Thử nghiệm `alpha` để tìm sweet spot.
- **PHỐI HỢP A:** Sau khi `connect()` dùng đúng INDEX_PARAMS, chạy
  `run_accuracy_benchmark()` của A để validate Recall@5 ≥ kỳ vọng (~90%+ trên
  synthetic corpus). Nếu thấp bất thường → kiểm tra vectorizer_config (phải None).

### Tuần 3: Giám sát đo lường (Benchmarking Analytics)
- Giám sát `weaviate_ingest_ms` và RAM tĩnh/động (từ `resource_monitor.get_all_stats`).
- Chạy `tradeoff.run_tradeoff_sweep` do A viết → lấy curve Recall vs Latency của Weaviate.
- Phân tích Trade-off giữa Hybrid Search vs Dense-only (thay đổi `alpha` và `Filter`
  phức tạp dần). Báo cáo cho A để add vào tab Filtering.

### Tuần 4: Viết Report Academic Khoa Học
- Tập trung sâu vào việc phân tích: Kiến trúc Modular của Weaviate đã hỗ trợ thuật toán Hybrid Search ngầm định (BM25 + Vector) xuất sắc ra sao so với việc phải code thủ công BM25 trên 2 hệ DB còn lại. So sánh API Ease-of-Use theo chỉ số DX.
- Trình bày một Architecture Diagram minh hoạ khối dịch vụ Weaviate.
- Chuẩn bị nội dung kiến thức để Q&A đối chất: Hệ điều hành bộ nhớ Garbage Collection trong Go ảnh hưởng gì đến tốc độ truy vấn ở Weaviate?  

## 3. Chỉ số Kỹ thuật Cần Đạt (KPIs)
- Kết nối thành công hệ thống python qua giao thức gRPC không báo lỗi time-out khi upload dữ liệu lớn.
- Báo cáo rõ ràng hai chỉ tiêu: `latency_ms` cho từng thao tác search, cấu trúc `memory_usage_mb` tiêu hao khi hệ thống rảnh rỗi và đang nạp dữ liệu.
- Phải đảm bảo bảo toàn dữ liệu bằng Docker Volumes tại `./volumes/weaviate_data` để Weaviate khi tái sinh không bị format trắng bộ nhớ.
