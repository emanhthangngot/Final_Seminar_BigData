# PERSON C: Trần Hữu Kim Thành - Milvus Database Specialist

## Cá nhân chịu trách nhiệm: Trần Hữu Kim Thành

- **Vai trò:** Chuyên gia Milvus, chịu trách nhiệm cho các tác vụ nạp và truy xuất dữ liệu từ C++ Distributed DB.
- **Mục tiêu:** Tối ưu hoá tìm kiếm triệu vector thông qua HNSW Index và quản lý bộ nhớ RAM cho kiến trúc phân tán.

## 1. Phân công nhiệm vụ chi tiết (Detailed Task Breakdown)

| Giai đoạn | Công việc chi tiết | Phương thức thực hiện | Kết quả đầu ra cụ thể |
| :--- | :--- | :--- | :--- |
| **Giai đoạn 1** | Deploy Milvus Standalone | Docker Compose (milvus + etcd + minio) | Cụm DB Milvus hoạt động tốt |
| **Giai đoạn 1.2** | Cấu hình gRPC port 19530 | Mở các port liên lạc nội bộ trong Docker | Kết nối thành công từ client Python |
| **Giai đoạn 2** | Triển khai Schema & CRUD | Sử dụng `pymilvus v2.3+` | Collection "SeminarRAG" có Schema dim=768 |
| **Giai đoạn 2.2** | Tối ưu Index HNSW | `metric_type: COSINE`, `index_type: HNSW` | Graph search cho kết quả tìm kiếm cực nhanh |
| **Giai đoạn 3** | Đo lường Latency & RAM | Sử dụng `@time_profiler` & `docker stats` | Chỉ số `milvus_ingest_ms` & `milvus_query_ms` |
| **Giai đoạn 3.2** | Phân tích RAM Spike | Quan sát bộ nhớ khi gọi `collection.load()` | Hiểu rõ cơ cấu In-memory search của Milvus |
| **Giai đoạn 4** | Phân tích kỹ thuật báo cáo | Nghiên cứu kiến trúc C++ Core Milvus | Báo cáo chi tiết về Distributed Architecture |

## 2. Đầu ra mong đợi kỹ thuật (Technical Deliverables)

| Sản phẩm | Thông số kỹ thuật yêu cầu | Chỉ số KPI đánh giá |
| :--- | :--- | :--- |
| **Milvus Client** | Hỗ trợ PyMilvus SDK ổn định | Latency search (top-5) < 50ms |
| **Index Config** | `M: 16`, `efConstruction: 64` | Khả năng nạp data song song ổn định |
| **Metrics Data** | Log chi tiết thời gian `flush()` và `load()` | Tốc độ load collection vào RAM |

## 3. Quản lý Rủi ro & Cách khắc phục (Risk Mitigation)

| Rủi ro | Giải pháp phòng ngừa | Thao tác khắc phục |
| :--- | :--- | :--- |
| **Treo RAM do Load toàn bộ** | Giới hạn số lượng collection load cùng lúc | Release collection không dùng khỏi RAM |
| **Lỗi kết nối etcd/minio** | Đảm bảo `depends_on` trong Docker Compose | Restart cụm 3 containers DB đồng bộ |
| **Lỗi Search khi chưa Load** | Thêm hàm kiểm tra `collection.is_loaded()` | Thực hiện `collection.load()` trước khi search |

## 4. Checklist thực hiện chuyên sâu

- [x] Thiết lập cụm Milvus (etcd, mini, standalone) trong Docker Compose.
- [ ] Implement hàm `connect()` và `insert()` trong `milvus_client.py`.
- [ ] Viết logic tạo chỉ mục HNSW sau khi đã nạp dữ liệu (Lazy Indexing).
- [ ] Hoàn thiện hàm `search()` trả về `List[str]` văn bản thuần.
- [ ] Thực hiện đo lường RAM Spike tại thời điểm `load()`.
- [ ] Đóng góp dữ liệu đo lường tài nguyên vào `metrics.csv`.

## 5. Đoạn mã giao tiếp mong đợi

```python
# src/db_clients/milvus_client.py
class MilvusDBClient(BaseVectorDB):
    def connect(self):
        connections.connect("default", host="localhost", port="19530")
        # Define fields: ID (Primary), Vec (Dim=768), Content (Str)
        # Create Collection and Load into RAM...
```
