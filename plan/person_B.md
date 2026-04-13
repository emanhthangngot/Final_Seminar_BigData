# Kế Hoạch Cá Nhân - Thành Viên B (Nguyễn Hồ Anh Tuấn)
**Vai trò:** Weaviate Database Specialist
**Kỹ năng bổ trợ:** Docker, Golang Patterns, gRPC

## 1. Mục tiêu công việc
Đóng vai trò Chuyên gia cho mảng quản trị CSDL Vector **Weaviate**. Nhiệm vụ chính là đóng gói thiết lập cài đặt của Weaviate, xây dựng logic Python kết nối đẩy dữ liệu, tìm kiếm thông tin và đo lường trực tiếp tốc độ, hiệu năng của Weaviate trong bối cảnh kiến trúc RAG theo đúng yêu cầu Master Plan.

## 2. Phân công chi tiết (Detailed Timeline)

### Tuần 1: Setup Môi trường
- Phân tích và viết file cấu hình cho Weaviate chạy stand-alone bằng Docker Compose, ưu tiên expose mạng gRPC tốc độ cao, đồng thời cấu hình port tiêu chuẩn (ví dụ 8080/REST và 50051/gRPC) để tránh đụng độ.
- Nghiên cứu Schema trong Weaviate để thiết lập Collection chuẩn `RAGDocument` quy định cụ thể kiểu dữ liệu lưu trữ Text và Vector.

### Tuần 2: Xử lý Tích Hợp (Ingestion Pipeline)
- Viết abstract implementer trong file Python `src/core/db_clients/weaviate.py`.
- Lập trình thực hiện tối ưu thao tác Vector hoá lưu bằng Batch Data `collection.batch.dynamic()` giúp hạn chế tắc nghẽn IO. 
- Xây dựng hàm tìm kiếm ANN Query ưu việt dựa vào đặc tính tối ưu của `nearVector` gọi hoàn toàn qua client gRPC từ Python SDK.

### Tuần 3: Giám sát đo lường (Benchmarking Analytics)
- Thiết lập thu thập thông số `weaviate_ingest_ms` tiêu thụ cho tác vụ chèn hàng loạt (Ví dụ lấy mốc 1000 vectors cho một chu kỳ log).
- Giám sát RAM Resource tiêu dùng từ hệ lõi Golang của Weaviate bằng `docker stats`. Ghi chú cẩn thận sự dao động RAM lúc idle và lúc peak.
- Phân tích hiệu suất kỹ thuật khi Weaviate dùng chức năng Batching. Phối hợp với A tích hợp số liệu lên CSV.

### Tuần 4: Viết Report Academic Khoa Học
- Dành thời gian hoàn thành section viết Word phân tích cụ thể bản chất Weaviate: Vì sao dùng hệ viết bằng Go? Ưu việt của Module System khi tích hợp mô hình ngoài so với DB khác là gì. Bảng giá License thực tế ra sao.
- Trình bày một Architecture Diagram minh hoạ khối dịch vụ Weaviate.
- Chuẩn bị nội dung kiến thức để Q&A đối chất: Hệ điều hành bộ nhớ Garbage Collection trong Go ảnh hưởng gì đến tốc độ truy vấn ở Weaviate?  

## 3. Chỉ số Kỹ thuật Cần Đạt (KPIs)
- Kết nối thành công hệ thống python qua giao thức gRPC không báo lỗi time-out khi upload dữ liệu lớn.
- Báo cáo rõ ràng hai chỉ tiêu: `latency_ms` cho từng thao tác search, cấu trúc `memory_usage_mb` tiêu hao khi hệ thống rảnh rỗi và đang nạp dữ liệu.
- Phải đảm bảo bảo toàn dữ liệu bằng Docker Volumes tại `./volumes/weaviate_data` để Weaviate khi tái sinh không bị format trắng bộ nhớ.
