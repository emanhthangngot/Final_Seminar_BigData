# PERSON B: Hồ Anh Tuấn - Weaviate Golang Ecosystem
*Tài liệu Cẩm Nang Kỹ Thuật Chuyên Sâu (Deep Dive Playbook)*

Bạn là đại diện phô diễn sức mạnh của **Golang** thông qua cỗ máy Weaviate siêu cấp Cloud-Native DB. Toàn bộ mã nguồn `src/db_clients/weaviate_client.py` đã được tôi xây dựng chặt chẽ với V4 Client. Ở giai đoạn Phase 2, nhiệm vụ của bạn không còn là Code thuần nữa, mà là **Bứt Tốc** (Speed Optimization), **Săn Bắt Rác Bộ Nhớ** (Garbage Collection Hunting) và **Áp dụng Decorator Benchmark**.

---

## 1. Phân Tích Kỹ Thuật Cốt Lõi (Core Technical Deep-Dive)

### 1.1 Khác biệt Bản Lề gRPC so sánh với REST API
RESTful HTTP API hoạt động dựa trên text JSON string. Bạn gửi 1 mảng float 1536 phần tử qua JSON, file dung lượng mạng sẽ vọt lên hàng chục Megabytes cho một Insert request. Điều này sinh Overhead cho cả Socket lẫn Network I/O.
Vì bạn đang điều khiển thư viện Python Client V4 của Weaviate, nó mặc định giao thoa bằng **gRPC (Google Remote Procedure Call)**. Dữ liệu mảng cấu trúc sẽ được Serializer bằng Cấu trúc Nén Phân Tử `Protobuf` thành số nhị phân Binary cực nhẹ. Do đó, Benchmark Ingestion của bạn hứa hẹn độ trễ (Latency) nuốt data là SIÊU NHANH so với những DB xài REST cũ rích. Bạn phải chứng minh được luồng gRPC `port: 50051` này trong Slide.

### 1.2 "Dynamic Batching" & Phản Xạ Bộ Nhớ Golang (GC)
Python/C++ ngốn RAM mãi cho đến khi HĐH kết thúc tiến trình hoặc báo tràn bộ nhớ, nhưng Golang (Nền tảng của Weaviate) có Trình dọn rác (Garbage Collector). 
**Tại sao tôi chèn Context Manager `with collection.batch.dynamic() as batch:` vào Code Ingest của bạn?**
- Vì hàm `Dynamic Batch` của Weaviate là một ma thuật. Nó đo lường RAM hệ thống thực tế (Resource tracking). Thay vì cố nhồi nhét 5,000 document vào DB cùng một lúc gây vỡ ống mạng (Network Packet Timeout), nó đánh giá sức chịu đựng của Docker container. Nó sẽ cắt làm 50 luồng nhỏ, mỗi luồng 100 docs gửi nối tiếp đi dạng Multi-thrread. Nếu Docker có dấu hiệu bị ép RAM (OOM Alert), tiến trình Batch TỰ ĐỘNG điều áp (Throttle down), truyền ít điểm ảnh mạng hơn, thay vì crash sập DB. Bạn phải quay phim đo lường được khoảnh khắc thông minh này.

---

## 2. Nhiệm vụ Kiểm Thử Tính Năng (Detailed Actionable Tasks)

> [!IMPORTANT]
> Công việc lúc này không phải ngồi sửa mã (Trừ việc gắn Profile thời gian), mà là dùng tài nguyên Máy Áo / Hệ điều hành để mổ xẻ (Audit) Weaviate.

### Task 1: Thiết Lập Thợ Săn RAM Docker (Start-up Diagnostics)
1. **Kiểm tra file YML:** Mở `docker-compose.yml`, kiểm soát rằng Container `weaviate` giới hạn bộ nhớ: cấp Flag cứng nhứ `mem_limit: 1.5g`.
2. **Boot DB Mới:** Xóa thư mục Bind Volumes ảo (Xoá DB cũ để test clean). Gọi `docker compose up -d`.
3. Mở sẵn 1 cửa sổ Console CLI Command phụ, đánh thẳng lệnh: `docker stats seminar_weaviate`.
4. Quan sát số `MEM USAGE / LIMIT`. Đặc thù của Go, khi Standby Idle, con RAM tĩnh của Weaviate sẽ khoảng **~250MB đến 350MB**. Rất nhẹ.

### Task 2: Gắn Khung Benchmark (Áp Decorator Ingestion)
1. Mở Text Editor tại `src/db_clients/weaviate_client.py`. Import hàm đo lường do tôi tạo sẵn:`from benchmark.monitor import time_profiler`.
2. Gắn vương miện Decorator đó lên đỉnh Class Method `insert()` và `search()`:
   ```python
   @time_profiler(metric_name="Data Ingestion + Vector Bulk Upload", engine_name="Weaviate")
   def insert(self, chunks: List[str], embeddings...
   ```
3. Xong, mỗi khi Team bấm Nút Nạp File Streamlit, Terminal Python bạn Code sẽ tự động Console Time elapsed của quá trình Ingestion của Weaviate ra ms chính xác 100%.

### Task 3: Kịch Bản Test Khốc Liệt Cố Ý Văng (Stress Test Dynamics)
Để Slide của bạn có Data thuyết phục ăn đứt nhóm khác:
1. Bạn báo Person A chuẩn bị 1 File PDF tầm 1500 trang. Kích hoạt Ingest.
2. Tại Terminal `docker stats`: Chụp tấm ảnh RAM Golang vọt lên cỡ `1.49 GB` (Chạm ngưỡng Limit cứng).
3. Weaviate Dynamic Builder TỰ ĐỘNG nhận ra, và nó bóp băng thông gửi gRPC chậm lại, khiến thời gian chạy cực lâu, nhưng DB **Không bao giờ bị OOM Killed Crash**. Nó xả rác ngay lập tức sau đó làm RAM thụt xuống lại 500MB (Biểu diễn đường cong răng cưa rác của Golang).

---

## 3. Quản Trị Khung Khái Niệm Báo Cáo (Expected Deliverables)

Vào những ngày Seminar Review, bạn phải chuẩn bị:
1. **Dữ liệu CSV Bền Vững:** Hàm `insert` chạy xong, phải xuất đè thông số Thời Gian tính bằng Ms mới nhất của Weaviate xuống Row số 2 của file `src/benchmark/metrics.csv` để bảng UI Plotly nảy mực đỏ/xanh biểu đồ.
2. **Kịch Bản Slide Nhấn Mạnh Go Multi-threading:** Lên ý tưởng slide 5 phút làm rõ khác biệt Kiến trúc RAG Class Document của Go-v4 SDK với Database truyền thống. Trình diễn 3 bức ảnh cắt ra từ Docker Stats mô tả cái nhìn từ tĩnh cho đến Peak Ingestion. Không đi lan man rườm rà. Mục tiêu cuối là Kết luận sức kéo của `Dynamic Batching`.
