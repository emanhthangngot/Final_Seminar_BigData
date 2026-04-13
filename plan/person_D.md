# Kế Hoạch Cá Nhân - Thành Viên D (Trần Lê Trung Trực)
**Vai trò:** Qdrant Database Specialist
**Kỹ năng bổ trợ:** Rust Performance, Vector Algebra, API Design

## 1. Mục tiêu công việc
Đảm nhận vị trí Quản trị viên Chuyên trách CSDL **Qdrant**. Sản phẩm được phát triển bằng ngôn ngữ Rust tối ưu hoá cực đại bộ nhớ. Thành viên D mang nhiệm vụ cung cấp bằng chứng cho slide thuyết trình chứng tỏ Qdrant nhẹ gọn thế nào, xây dựng logic code python liên thông đẩy và vector hóa tìm kiếm, phục vụ Benchmark chung của toàn Master Plan.

## 2. Phân công chi tiết (Detailed Timeline)

### Tuần 1: Setup Môi trường Storage
- Cài đặt Container đơn cấu trúc của Qdrant trên local bằng lệnh cấu hình Docker. Định nghĩa rõ Volume persistence sao cho Vector ghi được lưu dải chặt xuống Folder System host chứ không bay hơi khi Restart.
- Tạo một kết nối thử thông qua Python client `qdrant-client` kiểm tra quyền Collection Management. Đính kèm khoảng cách phương pháp đo toán học bắt buộc `Distance.COSINE` vào cho `dim=768`.

### Tuần 2: Xử lý Payload và API Upload
- Thể hiện sự nhất quán thông qua việc design pattern trong class `db_clients/qdrant.py`.
- Tối ưu chu trình lưu trữ, tận dụng phương thức API `client.upload_points()` chuyên biệt của Qdrant, đẩy batching payload/metadata kèm với Vector thông tin cực nhanh từ LangChain TextSplitter.
- Xử lý mượt mà tác vụ query. Viết bổ sung chức năng Payload Filtering (truy vấn kết hợp vector và điều kiện metadata như nguồn của document hoặc ID tài liệu) giúp RAG được gọn gàng tránh nhầm lẫn text context.

### Tuần 3: Giám định Thực Quyền Performance (Benchmarking)
- Trích xuất thông số log time chạy Python cho Ingestion tốc độ `qdrant_ingest_ms` cho chuẩn định 1000 vectors.
- Điểm mạnh của Rust là RAM siêu nhẹ. Bắt tay vào chụp thực tế `ram_at_idle` và kiểm chứng khi Peak Ingestion thì biến động dao động như thế nào, sau đó đúc rút sang `metrics.csv`.
- Theo sát quá trình search latency ổn định không nếu có cả hoạt động filter metadata lồng vào toán học C-Cosine.

### Tuần 4: Paper Document Analysis
- Thiết kế riêng báo cáo học thuyết phân tích lõi Rust tạo nên sức hút Zero-cost của Qdrant. Giải thích cấu tạo kỹ thuật chuyên sâu mang tên Binary Quantization (Tính năng nén định dạng vector mới nổi tiết kiệm tới 40 lần RAM).
- Trích xuất tổng thị phần Qdrant Github (hiện đang Trending cực nóng), mô hình kiếm tiền theo Qdrant Cloud. Soạn Architecture Diagram khối hình.
- Chuẩn bị Q&A thuyết trình trên lớp: Tại sao lại recommend Start-up ít tài nguyên sử dụng sản phẩm này? Tại sao API Qdrant thường được DEV Backend thích hơn?

## 3. Chỉ số Kỹ thuật Cần Đạt (KPIs)
- Kết nối thành công cho ra `search_latency_ms` siêu thấp. Đo đạc lượng RAM trơn tru và chứng thực bằng số cực đại là thấp hơn Weaviate.
- Mã code Python phải rất tường minh, không block hàm, đặc biệt lưu tâm áp dụng decorator `@time_profiler` vào các điểm call mạng API để logging thời điểm.
- Hỗ trợ sát sao Thành viên A trên Dashboard giúp các biểu đồ phản hồi trung thực sức mạnh Qdrant.
