# PERSON D: Trần Lê Trung Trực - Qdrant Rust Master & Speed Benchmark
*Tài liệu Cẩm Nang Kỹ Thuật Chuyên Sâu (Deep Dive Playbook)*

Hệ thống Vector API siêu nhẹ bằng REST của Qdrant trong thư mục `src/db_clients/qdrant_client.py` đã kết cấu xong xuôi hoàn chỉnh bằng Tiếng Anh. Mảng 2 chiều Vector được bọc Payload cẩn thận vào `models.PointStruct` như Plan cũ. Tại Giai đoạn 2 này, nhiệm vụ của bạn là hoá thân thành "Rust Advocate", Càn quét **Tốc độ Đặt Lệnh Bất Đồng Bộ** và chứng minh lý thuyết **Bảo Mật Bộ Nhớ Cực Tiểu Của RUST (Zero-Cost Abstractions)**.

---

## 1. Phân Tích Kỹ Thuật Cốt Lõi (Core Technical Deep-Dive)

### 1.1 Sức mạnh Cấp Phát Tĩnh của Ngôn Ngữ Rust (The "Zero-cost" Myth)
Nếu Java / Go (Weaviate) sở hữu một bộ Càn Quét Rác Nhớ Trống (Garbage Collector Memory) chạy điếng người theo chu kỳ gây Spike Delay, hay C++ (Milvus) Cấp phát RAM sống (Malloc / Pointer) cực loạn dẫn tới vọt Spike lên 3GB lúc Load Data Graph RAM... 
Thì Cỗ lõi **RUST** của Qdrant KHÔNG LÀM RA RÁC THEO CHU KỲ NÀO HẾT. Cơ chế Borrow / Ownership quản lý bộ nhớ lúc Compile Time giúp Qdrant khi không làm gì (Idling Standby) ngốn **chưa tới 80MB-100MB RAM** (Trong khi Milvus ngốn 1.5GB cho 3 node, Weaviate 300MB). Qdrant chính là nhà Vô Địch siêu Cổ Chai RAM về Mảng Benchmark Hệ Thống Phần Cứng cho Sinh viên Laptop.

### 1.2 "Payload Extraction" & Parallels Push Structs (Upload Điểm Song Song)
Qdrant không chia bảng (Table) mà thiết kế Dữ Liệu là các Điểm Bay Trong Không Gian Tọa Độ Hình Học (**Space Points**). Nếu bạn không dính cái Khối Text Chữ Tiếng Việt (Do Langchain tách) vào cái `vỏ bọc Payload` JSON của cái Điểm Đó, bạn không bao giờ trả văn cảnh RAG về cho Chatbot LLM Streamlit được. 
Lợi thế siêu việt của D là `self.client.upload_points()`. Cú pháp này không hề đẩy từng cái Vector chậm chạp qua Socket. Qdrant Python SDK tự động bung Xé Các Luồng **Multi-threading parallel**, nén chúng thành lô (Batches) và ném liên thanh cực rát qua TCP/REST API Cổng `6333`. Đó là lý do Cột Biểu Đồ Ingestion ms (Milisecond) của bạn sẽ đứng Top 1 Bảng xếp hạng Tốc độ của Person A.

---

## 2. Nhiệm Vụ Giám Sát Tài Nguyên & Benchmark Metrics (Detailed Actionable Tasks)

> [!CAUTION]
> Dành cho Thuyết Trình Sinh Viên: Điểm thi 10 hay 9 chênh nhau ở chỗ Bạn Biết Tích Cực Gặp Lỗi Gì Khi Bench Dữ Liệu Căng Thẳng (Scale Testing), chứ không phải viết một Code Đẹp Vô Hình.

### Task 1: Chứng Minh RUST Bất Tử Bộ Nhớ (Memory Baseline Footprint)
1. **Kiểm tra File YAML:** Mở thư mục `docker-compose.yml`, kiểm soát Rằng Container `semianr_qdrant` có gắn thư mục Ổ cứng Local (Ví dụ `volumes: ./qdrant_data`). 
2. Mở Terminal mới thứ 2, chạy Monitor liên tục: `docker stats seminar_qdrant`.
3. Bắt đầu tải file 20 MB hoặc 1 sách Dày Học Thuật PDF cực kỳ nặng lên Node Web. Canh Bắt **Memory Usage** của Node Rust này. Chụp màn hình (Làm tài liệu thuyết trình Seminar). 
4. Ghi Nhận: So với Milvus vọt lên 4GB, RAM của RUST Qdrant chỉ nhích nhẹ nhàng mềm mại, CPU vọt 1 chút cho đa luồng nhưng hoàn toàn không có cảm giác Lag Rối Giật Lắc Server OS. Phải show được Bằng Chứng Ảnh Chụp Cổ Chai này.

### Task 2: Cài Máy Đo Nhịp Decorator & Validations (Code Implementation)
1. Bật `src/db_clients/qdrant_client.py`. Nhập khẩu Function Máy đo Profile của Dự án: `from benchmark.monitor import time_profiler`.
2. Khoác bộ áo Decorator ấy qua Method `insert()` và `search()`:
   ```python
   @time_profiler(metric_name="Points Parallel Insert", engine_name="Qdrant")
   def insert(self, chunks: List[str]...
   ```
3. Ghi Xuống File CSV tự động: Thiết đặt hàm thao tác Append Array Pandas / Python `csv` ghi con số ms Thời Gian trực tiếp Ghi đè dòng Số 1 thuộc tên `Qdrant` tại Thư mục `src/benchmark/metrics.csv`. (Chỉ khi Qdrant ghi đè tệp CSV xong, Thì App Streamlit của Person A bấm Reload Chart mới vọt Biểu đồ Plotly Chạm nóc được).

### Task 3: UTF-8 Payload Verification (Gỡ Lỗi Ký Tự JSON Payload)
- Khi File Tiếng Việt có các Ký tự Dấu (Ngã, Hỏi, Nặng, Chữ Toán Học Latex PDF). Vector Ingestion bằng Python lên Qdrant Json Payload Rất Hay bị Mã Hoá Thành Mã ASCII Unicodes `\u00A0...`. Qdrant trả kết quả list String String cho Chatbot Prompt OpenAI dễ bị Rối Halluniciation chữ Hán Nôm hoặc Sượng Từ Ngữ Cú Pháp.
- Yêu Cầu Test: Bạn Mở RAG lên chat hỏi Qdrant (Khi nó chắt Văn Cảnh Pdf) Ra coi thử chữ Tiếng Việt Console Log có Bị Trục Trặc Không. Bạn test 1 lần bằng Print là biết Ngay!

---

## 3. Quản Trị Khung Khái Niệm Báo Cáo Seminar (Expected Deliverables)

Vào những ngày Seminar Review, bạn phải chuẩn bị:
1. **Bảng Bằng Chứng Dữ Liệu Thời Gian Chuẩn Xác Nhất:** Rớt đài con số 2.50 ms hay 1000.41 ms xuống `metrics.csv`.
2. **Slides Cấu Cốt Lõi Hệ Thống Tối Trọng Nén (BQ):** Trong file Báo Cáo Slide của Cá Nhân D, Bạn phải giải mã lý thuyết Binary Quantization. Mặc dù Team mình Dùng Float COSINE, Nhưng Bạn hoàn toàn bảo vệ Đạt Điểm Tuyệt Đối nếu Chứng Minh cho Giáo Giảng Viên Rằng: "Nếu Tụi Em Set Cờ BQ Parameter, Index Thủng Lỗ của Qdrant Thu nhỏ Dung lượng Đĩa Cứng Lại Tới ... 32-40 LẦN!". Trình độ học thuật Big Data Research Nằm ở Việc chắt Bão Kiến Thức đó.
