# PERSON B: Nguyễn Hồ Anh Tuấn - Weaviate Database Specialist

## Cá nhân chịu trách nhiệm: Nguyễn Hồ Anh Tuấn

- **Vai trò:** Chuyên gia Weaviate, chịu trách nhiệm cho các tác vụ nạp và truy xuất dữ liệu từ Golang-based DB.
- **Mục tiêu:** Cung cấp kết nối gRPC ổn định, tối ưu hoá Batch Ingestion và truy vấn vector hiệu quả cao.

## 1. Phân công nhiệm vụ chi tiết (Detailed Task Breakdown)

| Giai đoạn | Công việc chi tiết | Phương thức thực hiện | Kết quả đầu ra cụ thể |
| :--- | :--- | :--- | :--- |
| **Giai đoạn 1** | Container hóa Weaviate | Docker Compose `image: semitechnologies/weaviate:latest` | Instance Weaviate chạy ổn định |
| **Giai đoạn 1.2** | Cấu hình gRPC port 50051 | Mở port trong Docker và map ra host | Kết nối gRPC từ client Python thành công |
| **Giai đoạn 2** | Triển khai Schema & CRUD | Sử dụng `weaviate-client v4` | Class `Document` có schema `content` (text) |
| **Giai đoạn 2.2** | Tối ưu nạp dữ liệu (Batch) | Sử dụng `collection.batch.dynamic()` | Nạp hàng nghìn vectors chỉ trong vài giây |
| **Giai đoạn 3** | Đo lường Latency & RAM | Sử dụng `@time_profiler` & `docker stats` | Bản ghi `weaviate_ingest_ms` & `weaviate_query_ms` |
| **Giai đoạn 3.2** | Stress Test hiệu năng | Nạp 10,000 vectors và k6 test (nếu có) | Phân tích throughput cực đại của Weaviate |
| **Giai đoạn 4** | Phân tích kỹ thuật báo cáo | Nghiên cứu kiến trúc Golang GC | Báo cáo chi tiết về cơ chế quản lý bộ nhớ |

## 2. Đầu ra mong đợi kỹ thuật (Technical Deliverables)

| Sản phẩm | Thông số kỹ thuật yêu cầu | Chỉ số KPI đánh giá |
| :--- | :--- | :--- |
| **Weaviate Client** | Hỗ trợ gRPC v4 API mới nhất | Latency search (top-5) < 30ms |
| **Schema Config** | `vectorizer: none`, `dim: 768` | Dữ liệu nạp vào không bị từ chối |
| **Metrics Data** | Log chi tiết từng bước Ingest | Tốc độ nạp (vector/giây) đạt mức cao |

## 3. Quản lý Rủi ro & Cách khắc phục (Risk Mitigation)

| Rủi ro | Giải pháp phòng ngừa | Thao tác khắc phục |
| :--- | :--- | :--- |
| **Block port 50051** | Kiểm tra Firewall và Docker map | Restart Docker Engine và check `netstat` |
| **Schema Mismatch** | Xây dựng hàm `init_schema()` tại `connect()` | Flush toàn bộ DB và tái lập Schema mới |
| **OOM (Out of Memory)** | Giới hạn `mem_limit: 2GB` trong Docker | Tối ưu tham số `batch_size` nhỏ lại |

## 4. Checklist thực hiện chuyên sâu

- [x] Thiết lập Weaviate trong Docker Compose chung.
- [ ] Implement hàm `connect()` trong `weaviate_client.py`.
- [ ] Viết logic `insert()` sử dụng dynamic client-side batching.
- [ ] Hoàn thiện hàm `search()` trả về `List[str]` văn bản thuần.
- [ ] So sánh sự khác biệt về tốc độ giữa gRPC và REST (Bench nội bộ).
- [ ] Đóng góp dữ liệu đo lường RAM vào `metrics.csv`.

## 5. Đoạn mã giao tiếp mong đợi

```python
# src/db_clients/weaviate_client.py
class WeaviateDBClient(BaseVectorDB):
    def connect(self):
        # Weaviate v4 Python client connect to local
        self.client = weaviate.connect_to_local(port=8080, grpc_port=50051)
        # Verify collection schema...
```
