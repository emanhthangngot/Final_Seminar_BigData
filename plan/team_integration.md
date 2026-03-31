# CHIẾN LƯỢC HỘI QUÂN (Team Integration & Demo Playbook)

Khi Person A, B, C, D đã gõ xong những dòng Code cuối cùng trong tệp của mình, đây là lúc sinh ra "Nút Thắt Cổ Chai Lắp Ráp". Rất nhiều nhóm đạt 10 điểm ở nhà nhưng khi lên bục Demo thì hệ thống sụp đổ vì xung đột (Merge Conflicts). Tài liệu này là **Hiến pháp bắt buộc** để cả nhóm kết hợp thành một App Streamlit Benchmark duy nhất và sống sót qua buổi Seminar đẫm máu.

---

## 1. Đồng Bộ Hóa Cấu Trúc Data Không Gian (The Dimension Pact)

Tính mạng của Hệ thống RAG phụ thuộc vào con số Số Chiều Vector (Dimension). Vì Person A đã quyết định dùng Model Local **Ollama `nomic-embed-text`**.
- Lệnh cấm: **KHÔNG DÙNG 1536 (OpenAI)**. Kích thước chuẩn từ giờ là **768**.
- **Person B (Weaviate):** Không cần chỉnh sửa Cấu trúc Schema vì Weaviate BYOV (Bring Your Own Vectors) sẽ tự nội suy độ dài của Vector Langchain.
- **Person C (Milvus):** Bắt buộc phải vào `milvus_client.py`, tìm đoạn `FieldSchema(name="vec", dtype=DataType.FLOAT_VECTOR, dim=1536)` sửa thành `dim=768`. Nếu quên, C++ sẽ đấm văng file Insert của bạn!
- **Person D (Qdrant):** Phải vào `qdrant_client.py`, chỗ `size=1536` sửa thành `size=768`.

## 2. Giao Thức Lắp Ráp Code (GitHub & Integration Rules)

Không gửi file `.py` qua Zalo hay Messenger. Phải xài GitHub Branches!
1. **Person A (Frontend Boss):** Tạo nhánh Repository tên là `main`. A sẽ đẩy file `app.py` và `processor.py` lên trước tiên. Tệp `metrics.csv` ban đầu phải là tệp Trống.
2. **Person B, C, D (Backend DB Devs):**
   - Lệnh Git Pull kéo file của A về máy. Tạo nhánh mới `feature/weaviate_integration`, `feature/milvus_integration`, `feature/qdrant_integration`.
   - Lần lượt PUSH Code `weaviate_client.py`... lên. A sẽ là người Review và bấm nút Merge vào nhánh Main.
3. **Quy luật Trả Dữ Liệu RAG (Data Return Protocol):**
   - Khi Code, 3 bạn B-C-D phải thiết kế Hàm `search()` trả về đúng một Format duy nhất: **Array chứa các chuỗi String Văn Bản** (vd: `["Đoạn 1", "Đoạn 2"]`).
   - Tuyệt đối không trả về Mảng Đối Tượng (Dictionaries hay Class C++) như `[{"text": "Đoạn 1"}]` hay mảng PointScored. Person A không có rảnh để viết 3 hàm bóc tách dữ liệu cho 3 cái Database khác nhau. A chỉ bóc `List[str]`, do đó Array C++ hay JSON của Go/Rust phải được B,C,D "Flatten" lại trước khi lệnh return.

## 3. Quản Trị Hệ Thống Docker & Đo Lường CSV

### 3.1. Phân Bổ Mặt Trận (Docker Ports)
Cả khối Database phải nằm trong 1 File `docker-compose.yml` duy nhất (Tránh mở 3 cửa sổ CMD chạy lặt vặt).
- **Qdrant (D):** Án ngữ Port `6333` và `6334`.
- **Weaviate (B):** Án ngữ Port `8080` và `50051` (gRPC Protocol).
- **Milvus (C):** Án ngữ Rất Nhiều Cổng, nhưng cốt lõi là `19530` và Port Etcd/MinIO không được trùng với 8080 của Go. 
=> Lệnh Khởi động của cả Team: `docker compose up -d` (Lên đầy đủ 3 cơ sở hạ tầng trong 3 giây).

### 3.2. Chống Xung Đột Tệp Đo Đạc (File Write Collision)
Hàm Decorator `@time_profiler` của cả B,C,D sẽ cùng nhắm vào việc đè dòng chữ xuống File `src/benchmark/metrics.csv`.
- Nếu 3 App chạy song song thì Hệ Điều Hành Windows/Linux sẽ báo Lỗi khóa tệp ("File In Use By Another Process").
- **Chiến Thuật Bắt Buộc:** Tại giao diện Streamlit `app.py`, Person A phải thiết kế code sao cho: Chỉ cái Database nào được Bôi Đen Tích Chọn ở Menu Dropdown Thanh Sidebar thì mới được Phép Tạo Lớp Instantiate Client (`active_db`). Lúc đó, DB đang ngâm sẽ hoạt động độc quyền và Write xuống CSV. Các DB khác thì im lìm (Idle State).

---

## 4. Kịch Bản Tổng Duyệt Thuyết Trình (End-to-End Live Demo Rehearsal)

Ngày lên Hội Đồng báo cáo, Mọi thứ phải diễn thật lôi cuốn, có Drama như màn ra mắt iPhone của Steve Jobs:

**Phase 1: Show Cơ Sở Hạ Tầng Tĩnh (Idle Ram)**
- Cả team mở Terminal 1: Gõ lệnh thần thánh `docker stats`.
- Thuyết trình viên chỉ tay vào màn hình: *"Thưa thầy cô, 3 DB đang chạy Idling. Như Thầy thấy, Qdrant Rust tốn 50MB, Milvus vọt 1.5GB"*. (Ăn điểm Kĩ năng theo dõi OS Server).

**Phase 2: RAG Data Ingestion Stream (Băm nát Sách)**
- Person A vào Streamlit Web, chọn thanh bên Sidebar `Qdrant`. 
- Tải lên File Sách PDF Chuyên ngành siêu dày (20MB). Bấm Upload.
- Mọi người sẽ thấy App Streamlit báo "Data Processing: Đang Băm...". Liếc qua terminal `docker stats`: CPU của Qdrant dựng đứng lên Multi-threading, RAM phình lên rồi xẹp xuống siêu nhanh. 
- Mở qua tab Benchmark, thấy biểu đồ Qdrant Ingestion Time nhích lên siêu ngắn. Team chứng minh được Tốc Động Nuốt Khủng.

**Phase 3: Vấn Đáp Ollama Chatbot (Khẳng định RAG Không dỏm)**
- Gõ vào khung chat hỏi AI Tiếng Việt: *"Theo chương 2 quyển sách này, Weaviate là gì?".*
- Ollama suy nghĩ khoảng 10 giây (Streamlit xoay Loading Spinner), sau đó Text trả ra rành mạch từ ngữ lấy từ PDF. Team xác nhận đã hoàn tất Vòng Lặp Semantic RAG Siêu Xịn!

**Phase 4: HNSW Search Tranh Biện (Truy Sát Cổ Chai Milvus)**
- Giữ nguyên Web, Person A chuyển menu Database sang chọn `Milvus`. 
- Bấm Gởi Câu Chat Y Hệt Ban Nãy. Milvus lập tức kích hoạt hàm `load()`.
- Rầm! Cả hội đồng nhìn Cột hiển thị Memory của Terminal `docker stats`: RAM Docker bật vọt lên 4GB như một con Quái kiệt khát nước. Và Chatbot vẫn trả về kết quả 5 milisecond.
- Chốt Slide: *"Milvus đổi RAM Spike khổng lồ để lấy Lượng Truy Xuất Gấp Đôi C++ Cổ Điển"*. Cuộc Seminar kết thúc mỹ mãn bằng Tràng Tiếng Vỗ Tay!
