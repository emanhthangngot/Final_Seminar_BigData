# Kế Hoạch Cá Nhân - Thành Viên C (Trần Hữu Kim Thành)
**Vai trò:** Milvus Database Specialist
**Kỹ năng bổ trợ:** C++ Core Logic, etcd, Distributed Systems

## 1. Mục tiêu công việc
Sắm vai Chuyên gia nền tảng về hệ CSDL Vector **Milvus**. Vận hành cụm Milvus Standalone (thường yêu cầu cả etcd và object storage đi kèm), tuỳ biến index HNSW, phân tích hệ lõi xử lý C++, đo lường hiệu năng chuyên sâu cho báo cáo hệ thống Benchmarking so sánh ba nền tảng để lấy điểm 10 theo kế hoạch Master Plan.

## 2. Phân công chi tiết (Detailed Timeline)

### Tuần 1: Thiết lập Hệ Sinh Thái Môi trường
- Soạn thảo và viết `docker-compose.yml` cực chuẩn để run hệ sinh thái liên kết Milvus Standalone, etcd, và MinIO trong cùng một lớp network cục bộ.
- Khởi tạo client Python, tạo Collection mẫu, sau đó mapping Schema trường thông tin đặc thù của Milvus (Id kiểu `Int64`, Embeddings kiểu `FloatVector`, quy chuẩn `dim=768`).

### Tuần 2: Rút gọn CRUD & Chuẩn bị Query Vector
- Triển khai tệp mã nguồn chuyên dụng `db_clients/milvus.py` tích hợp chuẩn giao tiếp hệ thống.
- Cài đặt hệ thống lệnh nạp luồng qua hàm `insert()`. Vận hành linh hoạt hành động `collection.flush()` bắt buộc phải có để niêm phong đoạn dữ liệu đĩa sau khi tải xuống. 
- Tìm hiểu cấu hình tinh chỉnh thông số HNSW Index (ví dụ: tham số M=16, efConstruction=64) để tăng hiệu suất truy vấn gần nhất. Gọi thao tác `collection.load()` - 1 thủ tục bắt buộc ở Milvus nhằm kéo dữ liệu Index từ SSD lên RAM phục vụ truy vấn tối đa công năng.

### Tuần 3: Giám Sát Tài Nguyên & Lấy Metrics
- Kích hoạt Python code đo lường thời gian đáp ứng đẩy hàng loạt `milvus_ingest_ms`.
- Lắng nghe hoạt động tài nguyên CPU Utilization thực thụ thông qua việc phân tích Monitor hoạt cảnh của cụm Milvus, etcd, minio.
- Đánh giá sự kiện RAM Spike (Giật lên đỉnh tài nguyên ram) khi user ra lệnh gọi hàm Load() Data từ ổ đĩa lên bộ nhớ. Đưa báo cáo cụ thể độ trễ này có chấp nhận cho Real-time ko.

### Tuần 4: Sắp Xếp Trình Bày Document & Video Demo
- Cống hiến kỹ năng viết báo cáo phần kiến trúc lõi của Milvus: Giải thích cấu tạo Coordinator Node/ Worker Node. Mô phỏng vì sao giới Big Data và Enterprise siêu lớn lại hay xài Milvus?
- Khảo cứu đưa ra thực trạng thị trường: Số stars trên Github, mô hình kiếm tiền theo License của sản phẩm, hệ thống Cloud hiện hành.
- Sắp xếp và triển khai Quay Video Demo mạch lạc nhất đối với phiên thực thi của riêng Milvus trong hệ thống RAG Ràng Buộc, bảo đảm luồng UI thực thi rõ ràng mà ko dồn dập lỗi môi trường.

## 3. Chỉ số Kỹ thuật Cần Đạt (KPIs)
- Hoàn thiện lập chỉ mục, việc Search() diễn ra phản hồi bình thường sau thủ tục Load(), hệ thống hiển thị rành mạch `Index Ready`.
- Cung cấp chính xác biến đo lường tốc độ tính theo `vectors/sec`, tính toán rạch ròi tỉ lệ ăn CPU theo core khi thực thi truy vấn HNSW.
- Lưu ý rủi ro tài nguyên Milvus có thể yêu cầu nhiều GB disk và Ram, phải set limit memory trên yaml hợp logic.
