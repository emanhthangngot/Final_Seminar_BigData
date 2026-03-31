# PERSON C: Trần Hữu Kim Thành - Milvus Native C++ Scaling
*Tài liệu Cẩm Nang Kỹ Thuật Chuyên Sâu (Deep Dive Playbook)*

Quỷ dữ ngốn RAM khổng lồ Milvus đã được đóng gói xong API trong `src/db_clients/milvus_client.py`. Nó là kẻ duy nhất đòi hỏi một Schema `CollectionSchema` cứng ngắc đến nghẹt thở (Bắt phải khai báo 1536 Float Dimension và cấm Json Payload phi cấu trúc). Tại Phase 2, nhiệm vụ của bạn là hoá giải sự phình to của kiến trúc **Distributed C++** và trở thành Kỹ Sư Toán Học Tối Ưu hoán vị Thông Số Lập Chỉ Mục (Index Tuning Engineer).

---

## 1. Phân Tích Kỹ Thuật Cốt Lõi (Core Technical Deep-Dive)

### 1.1 Separation of Storage & Search (Lưu Trữ Rời Rạc)
Các DB khác cất dữ liệu thẳng vào file của nó. Còn Cơ Chế Multi-Node Native của Milvus tách Storage (MinIO) và Metadata (etcd) riêng biệt. 
**Tại Sao Tôi Phải Gọi `collection.flush()` Trong Hàm Insert?** 
- Khi bạn bắn mảng DataFrame chèn cục Data vào, C++ Core của Milvus thả dữ liệu trôi lơ lửng trên Bộ Nhớ Tạm (RAM Buffer). Chừng nào Buffer nhỏ xíu đó đầy, nó mới tống rác xuống Đĩa cứng vật lý (MinIO).
- Lệnh Flush là lệnh bắt buộc (Ép ngắt) bắt bộ định tuyến Coordinator khoá lại trạng thái, tống mọi Segment trong bộ nhớ ảo xuống HDD. Chỉ khi lệnh Flush chạy xong, API chèn Vector mới hoàn thành vòng lặp. Nếu thiếu lệnh `flush`, Hàm Lập Chỉ Mục `create_index()` lập tức báo lỗi "Field Rỗng Không Có Dữ Liệu Nào".

### 1.2 "Memory Blood-Spike" Kĩ Thuật Nạp Lệnh RAM Graph (HNSW Load)
Câu lệnh `self.collection.load()` trong hàm Search là một trái bom nổ chậm về mặt tài nguyên hệ thống (Memory). Bạn không thể Search chay trong C++, toàn bộ biểu đồ Đồ Thị Toán Học HNSW Vector Index phải được bê từ Ổ Cứng lên RAM, dựng Mây Đồ Thị. Quá trình Load này sẽ kích hoạt Malloc (Cấp Phát Sống RAM) 1 cách bạo lực, đẩy RAM Usage của Docker giật bắn lên từ **1GB tĩnh lên đến 3-4GB Spikes**. Milvus Local vì thế KHÔNG HỀ DỄ CHƠI trên Laptop Sinh viên. Bạn phải đi báo cáo hiện tượng Tràn rác RAM (Memory Spike) học thuật này.

### 1.3 Cấu Trúc Đồ Thị Không Gian (HNSW Search Limits)
Nếu Qdrant giấu thuật toán vào Default, thì Milvus bắt ta phải làm kỹ sư toán học điều phối 2 giá trị sau trong `milvus_client.py`:
- `M=16`: Tượng trưng cho Max Đỉnh Vệ Tinh, mỗi đỉnh Đồ Thị có tối đa 16 cạnh nối.
- `efConstruction=64`: Phạm vi bán kính quét tìm neighbor khi Build Index. Giá trị càng bự, Index C++ càng nặng ký, Build càng lâu, RAM càng tốn. Bù lại Search siêu nhanh, Cực chính xác cực đoan (Lệnh search dùng thuộc tính `ef`).

---

## 2. Nhiệm vụ Thiết Kế Báo Cáo Đo Lường (Detailed Actionable Tasks)

> [!CAUTION]
> Công việc lúc này đòi hỏi bạn sử dụng các lệnh giám sát Command Line rất gay gắt trong lúc Data đang được đẩy Ingestion từ Web Streamlit.

### Task 1: Truy Tìm Cổ Chai Malloc Memory Spike (System Log Catching)
1. **Kiểm tra File YAML:** Mở thư mục `docker-compose.yml`, ngó xem giới hạn RAM của Node `milvus-standalone` là bao nhiêu (Có thể tôi chưa khoá Memory cho nó, hoặc khoá 3GB). Ngó xem etcd/minio đã liên kết bridge network chưa.
2. **Kích hoạt Monitor C++:** Ở Linux/WSL, Mở `htop` hoặc dùng lệnh `docker stats seminar_milvus`.
3. Nhờ Person A nạp 1 file PDF 15MB. Canh ngay lúc UI xoay vòng loading Báo Lập Index `collection.create_index` và `load()`, lấy tay chụp màn hình (PrintScreen) ngay lập tức lượng RAM C++ bung lụa (Từ mức Idle 1.5GB vọt thẳng đứng lên 4-5GB). Dùng đó làm File Chấm Điểm Thuyết Trình.

### Task 2: Gắn Bộ Đếm Mở Khoá HNSW Timer
1. Mở `src/db_clients/milvus_client.py`. Load hàm Profiler Benchmark giống của Weaviate.`from benchmark.monitor import time_profiler`.
2. Áo Decorator lên đỉnh Method `insert()` và `search()` của Class C++ `MilvusWrapper`.
   ```python
   @time_profiler(metric_name="C++ Ingestion & Flush Disks", engine_name="Milvus")
   def insert(self, chunks: List[str]...
   ```
3. Bạn sẽ nhận thấy vì phải Lồng Cả Trạng Thái `Flush()` xuống Etcd Storage, Ingestion của Milvus cực kỳ vất vả và trễ nhịp chậm hơn nhiều so với Qdrant nếu Push ÍT VECTOR. Milvus chỉ làm gỏi kẻ khác khi Push vài Tỷ dữ liệu. (Đó là Key Điểm 10 Báo cáo của bạn).

### Task 3: Thuật Toán Benchmark Tuning
Bạn sẽ trải qua 3 đợt Test Tweak Cấu hình: (Upload cái PDF 3 lần liên tục)
- **Lần 1:** Để `M=8, efConstruction=16`, `ef=16`. Ghi nhận số File Latency MS vào ô Milvus của Bảng `metrics.csv`.
- **Lần 2:** Để `M=32, efConstruction=256, ef=128`. Ghi đè chỉ số thời gian vào Excel CSV lại. Quan sát RAM của Hàm `load()` lúc này xem có sập C++ luôn không. Ghi nhận biểu đồ vọt của Ingestion Chart. HNSW nặng gấp 3 lần.

---

## 3. Khung Sườn Kết Luận Presentation (Expected Deliverables)

Vào hội đồng Seminar, File PPT của bạn phải có:
1. **Lược Đồ Micro-Architecture:** Cắt ảnh chụp 3 con Container Docker đang chạy. Minh hoạ cho Giảng Viên sự khổng lồ của Controller - Metastore(etcd) - Datalake (MinIO).
2. **Slide HNSW Memory Sacrifice:** Đem 2 tấm RAM Spike (Một tĩnh, Một vọt 4GB) để giải trình TradeOff của Thuật toán C++. "Đổi Memory khổng lồ lúc Load() Lấy Tốc Độ Scale Phân Tán Vector Vô Tận". Điểm 10 nằm ở đoạn này.
3. **Data Ghi Log Sạch Sẽ:** Bảo đảm Milvus CSV log phải rớt đúng data vô `src/benchmark/metrics.csv` và App Streamlit render Bar Chart Milvus Xanh Lục siêu chuyên nghiệp.
