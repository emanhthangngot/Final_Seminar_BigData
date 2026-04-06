# PERSON D: Trần Lê Trung Trực - Qdrant Database Specialist

## Cá nhân chịu trách nhiệm: Trần Lê Trung Trực

- **Vai trò:** Chuyên gia Qdrant, chịu trách nhiệm cho các tác vụ nạp và truy xuất dữ liệu từ Rust-based DB.
- **Mục tiêu:** Chứng minh tốc độ và sự ổn định của Qdrant trong việc quản lý bộ nhớ RAM siêu nhẹ và xử lý payload văn bản.

## 1. Phân công nhiệm vụ chi tiết (Detailed Task Breakdown)

| Giai đoạn | Công việc chi tiết | Phương thức thực hiện | Kết quả đầu ra cụ thể |
| :--- | :--- | :--- | :--- |
| **Giai đoạn 1** | Cài đặt Qdrant với Docker | `image: qdrant/qdrant:latest` | Instance Qdrant chạy ổn định |
| **Giai đoạn 1.2** | Cấu hình Persistence (Volume) | Map `/qdrant/storage` ra máy host | Dữ liệu không bị mất khi restart |
| **Giai đoạn 2** | Triển khai Schema & CRUD | Sử dụng `qdrant-client v1.7+` | Collection "SeminarQdrant" có cấu hình Cosine |
| **Giai đoạn 2.2** | Tối ưu nạp dữ liệu (PointStruct) | Sử dụng `client.upload_points()` | Nạp hàng nghìn points chỉ trong vài giây |
| **Giai đoạn 3** | Đo lường Latency & RAM | Sử dụng `@time_profiler` & `docker stats` | Bản ghi `qdrant_ingest_ms` & `qdrant_query_ms` |
| **Giai đoạn 3.2** | Kiểm chứng RAM usage cực thấp | So sánh bộ nhớ thực tế với DB khác | Chứng minh ưu thế của ngôn ngữ Rust |
| **Giai đoạn 4** | Phân tích kỹ thuật báo cáo | Nghiên cứu kiến trúc Zero-cost abstractions | Báo cáo chi tiết về cơ chế quản lý bộ nhớ |

## 2. Đầu ra mong đợi kỹ thuật (Technical Deliverables)

| Sản phẩm | Thông số kỹ thuật yêu cầu | Chỉ số KPI đánh giá |
| :--- | :--- | :--- |
| **Qdrant Client** | Hỗ trợ mô hình PointStruct chuẩn | Latency search (top-5) < 20ms |
| **Collection Config** | `distance: Cosine`, `size: 768` | RAM Usage cực thấp (<150MB Idle) |
| **Metrics Data** | Log chi tiết thời gian xử lý lô (Batch) | Tốc độ nạp (vector/giây) đạt mức cao |

## 3. Quản lý Rủi ro & Cách khắc phục (Risk Mitigation)

| Rủi ro | Giải pháp phòng ngừa | Thao tác khắc phục |
| :--- | :--- | :--- |
| **Mất dữ liệu sau restart** | Phải mount volume trong Docker Compose | Thực hiện snapshot backup định kỳ |
| **Lỗi Unicode Payload** | Đảm bảo mã hóa UTF-8 khi nạp text | Dùng `helpers.clean_text()` xử lý đầu vào |
| **Quá tải request đồng thời** | Giới hạn concurrency client-side | Implement hàng đợi truy vấn hoặc batching |

## 4. Checklist thực hiện chuyên sâu

- [x] Thiết lập Qdrant trong Docker Compose chung.
- [ ] Implement hàm `connect()` trong `qdrant_client.py`.
- [ ] Viết logic `insert()` sử dụng Batch upload points.
- [ ] Hoàn thiện hàm `search()` trả về `List[str]` văn bản thuần.
- [ ] Thực hiện đo lường RAM usage thực tế tại thời điểm stress test.
- [ ] Đóng góp dữ liệu đo lường tài nguyên vào `metrics.csv`.

## 5. Đoạn mã giao tiếp mong đợi

```python
# src/db_clients/qdrant_client.py
class QdrantDBClient(BaseVectorDB):
    def connect(self):
        # Qdrant v1.7+ client connect to local
        self.client = QdrantClient("localhost", port=6333)
        # Create collection: Distance.COSINE, VectorParams(size=768)...
```
