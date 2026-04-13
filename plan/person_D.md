# Kế Hoạch Cá Nhân - Thành Viên D (Trần Lê Trung Trực)
**Vai trò:** Qdrant Database Specialist
**Kỹ năng bổ trợ:** Rust Performance, Vector Algebra, API Design

## 1. Mục tiêu công việc
Đảm nhận vị trí Quản trị viên Chuyên trách CSDL **Qdrant**. Sản phẩm được phát triển bằng ngôn ngữ Rust tối ưu hoá cực đại bộ nhớ. Thành viên D mang nhiệm vụ cung cấp bằng chứng cho slide thuyết trình chứng tỏ Qdrant nhẹ gọn thế nào, xây dựng logic code python liên thông đẩy và vector hóa tìm kiếm, phục vụ Benchmark chung của toàn Master Plan.

## 2. Phân công chi tiết (Detailed Timeline)

### Tuần 1: Setup Môi trường Storage
- Cài đặt Container đơn cấu trúc của Qdrant trên local bằng lệnh cấu hình Docker. Định nghĩa rõ Volume persistence tại `./volumes/qdrant_data` sao cho Vector ghi được lưu dải chặt xuống Folder System host chứ không bay hơi khi Restart.
- Tạo một kết nối thử thông qua Python client `qdrant-client` kiểm tra quyền Collection Management. Đính kèm khoảng cách phương pháp đo toán học bắt buộc `Distance.COSINE` vào cho `dim=768`.

### Tuần 2: Xử lý Payload và API Upload
- Tối ưu chu trình `client.upload_points()`, batch payload/metadata kèm Vector.
- **FAIRNESS BẮT BUỘC:** Trong `connect()` phải pass `INDEX_PARAMS` vào
  `hnsw_config=models.HnswConfigDiff(m=INDEX_PARAMS["M"], ef_construct=INDEX_PARAMS["ef_construction"])`
  và ef search qua `search_params=models.SearchParams(hnsw_ef=INDEX_PARAMS["ef_search"])`.
  Không hardcode — fairness là điều kiện tiên quyết để benchmark có giá trị.
- **NHIỆM VỤ CỐT LÕI:** Hoàn thiện `search_hybrid()` — build `models.Filter` từ
  dict, pass vào `query_points(query_filter=...)`. Stretch: `prefetch` + sparse
  vectors cho hybrid thực sự.
- **PHỐI HỢP A:** Validate Recall qua `run_accuracy_benchmark` của A. Recall@5
  của Qdrant nên ≥ 90% trên synthetic corpus; nếu thấp, check `distance=COSINE`
  và `hnsw_config`.

### Tuần 3: Giám định Recall@K Performance (Benchmarking)
- Theo sát quá trình search latency ổn định không khi có cả hoạt động filter metadata lồng vào Graph HNSW. Đo đạc bằng biểu đồ trên UI.
- Phân tích RAM Usage `ram_at_idle` vs `Peak Ingestion` của Rust.
- Phối hợp chạy file `evaluator.py` để chứng minh liệu hệ thống Payload Filtering đặc thù của Qdrant có giúp tăng tỷ lệ Recall@1 ở các câu hỏi điều kiện nhiều hơn so với 2 DB kia hay không.

### Tuần 4: Paper Document Analysis
- Viết báo cáo chuyên môn về DX Score: Vì sao Rust SDK của Qdrant rất thanh lịch, clean, dễ tuỳ chỉnh Payload Filter. Đào sâu lý thuyết kiến trúc Lõi Rust kết hợp với chiến lược Data Nén (Binary/Scalar Quantization) tạo nên đột phá RAM như thế nào.
- Trích xuất tổng thị phần Qdrant Github (hiện đang Trending cực nóng), mô hình kiếm tiền theo Qdrant Cloud. Soạn Architecture Diagram khối hình.
- Chuẩn bị Q&A thuyết trình trên lớp: Tại sao lại recommend Start-up ít tài nguyên sử dụng sản phẩm này? Tại sao API Qdrant thường được DEV Backend thích hơn?

## 3. Chỉ số Kỹ thuật Cần Đạt (KPIs)
- Kết nối thành công cho ra `search_latency_ms` siêu thấp. Đo đạc lượng RAM trơn tru và chứng thực bằng số cực đại là thấp hơn Weaviate.
- Mã code Python phải rất tường minh, không block hàm, đặc biệt lưu tâm áp dụng decorator `@time_profiler` vào các điểm call mạng API để logging thời điểm.
- Hỗ trợ sát sao Thành viên A trên Dashboard giúp các biểu đồ phản hồi trung thực sức mạnh Qdrant.
