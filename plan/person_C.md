# Kế Hoạch Cá Nhân - Thành Viên C (Trần Hữu Kim Thành)
**Vai trò:** Milvus Database Specialist
**Kỹ năng bổ trợ:** C++ Core Logic, etcd, Distributed Systems

## 1. Mục tiêu công việc
Sắm vai Chuyên gia nền tảng về hệ CSDL Vector **Milvus**. Vận hành cụm Milvus Standalone (thường yêu cầu cả etcd và object storage đi kèm), tuỳ biến index HNSW, phân tích hệ lõi xử lý C++, đo lường hiệu năng chuyên sâu. Kết quả benchmark sẽ tự động hiển thị trên React Dashboard (trang `/latency`, `/accuracy`, `/tradeoff`) thông qua FastAPI backend do A xây dựng.

## 2. Phân công chi tiết (Detailed Timeline)

### Tuần 1: Thiết lập Hệ Sinh Thái Milvus
- Soạn thảo và verify `docker-compose.yml` (Milvus Standalone + etcd + MinIO cùng network).
- Khởi tạo client Python, tạo Collection mẫu, mapping Schema trường thông tin đặc thù:
  - Id kiểu `Int64`, Embeddings kiểu `FloatVector`, `dim=768`.
- Test: `MilvusWrapper().connect()` → collection exists, no errors.

### Tuần 2: Rút gọn CRUD & Chuẩn bị Query Vector
- Hoàn thiện `src/core/db_clients/milvus.py` (skeleton đã có sẵn `connect/insert/search`).
- `insert()` + `collection.flush()` phải stable với corpus 10K chunks.
- **FAIRNESS BẮT BUỘC:** Đọc `INDEX_PARAMS` từ `src.config` và pass vào HNSW
  index_params:
  ```python
  index_params = {
      "metric_type": INDEX_PARAMS["metric"],
      "index_type": "HNSW",
      "params": {"M": INDEX_PARAMS["M"], "efConstruction": INDEX_PARAMS["ef_construction"]}
  }
  search_params = {"params": {"ef": INDEX_PARAMS["ef_search"]}}
  ```
  **KHÔNG HARDCODE** — fairness là điều kiện tiên quyết.
- **NHIỆM VỤ CỐT LÕI:** Hoàn thiện `search_hybrid()` — dùng `expr` cho Boolean
  filter (vd `"category == 'tech' and year > 2023"`). Stretch: `AnnSearchRequest`
  + `RRFRanker` cho hybrid thực sự.
- **PHỐI HỢP A:** Chạy `run_accuracy_benchmark` validate Recall — nếu lệch so
  với Qdrant/Weaviate >5% thì kiểm tra lại index params hoặc consistency level.
  Kết quả hiển thị trực tiếp trên React Dashboard `/accuracy`.

### Tuần 3: Giám Sát Tài Nguyên & Đo lường Recall@K
- Kích hoạt Python code đo lường thời gian `milvus_ingest_ms` (qua `@time_profiler`).
- Lắng nghe RAM Spike khi kích hoạt `load()` data — log vào `metrics.csv`.
- Phối hợp với A: benchmark xem bộ lọc `expr` của Milvus xử lý ở quy mô lớn,
  so sánh Latency giữa chế độ Vector Only vs. expr filter.
- Đảm bảo data trong `metrics.csv` có đủ: `timestamp`, `Engine=Milvus`, `Operation`, `Duration_ms`.

### Tuần 4: Sắp Xếp Trình Bày Document & Video Demo
- Viết báo cáo chuyên sâu: sự đánh đổi giữa cấu trúc phân tán (Distributed Log-broker) cồng kềnh với tốc độ siêu việt của bộ lọc Boolean.
- Khảo cứu thực trạng: Github stars, License model, Cloud offering.
- Quay Video Demo mạch lạc về phiên thực thi Milvus trong hệ thống RAG — **không gộp cài đặt/config vào demo**.

## 3. Chỉ số Kỹ thuật Cần Đạt (KPIs)

- `search()` diễn ra phản hồi bình thường sau thủ tục `Load()`, hệ thống hiển thị `Index Ready`.
- `ingest_speed` (vectors/sec) và `cpu_utilization` xuất hiện đúng trong `/api/v1/metrics`.
- Recall@5 ≥ 80% trên synthetic corpus 1K (Milvus có thể hơi thấp hơn do consistency level).
- Memory limit set trong Docker Compose — không crash OS host.

## 4. Interface Bắt Buộc (`src/core/db_clients/milvus.py`)

```python
class MilvusWrapper(BaseVectorDB):
    def connect(self):
        # Đọc INDEX_PARAMS từ src.config — KHÔNG hardcode
        ...

    @time_profiler
    def insert(self, chunks: list, metadata: list):
        # batch insert + flush
        ...

    @time_profiler
    def search(self, query: list, top_k: int = 5) -> list[str]:
        # collection.search() sau khi load()
        ...

    @time_profiler
    def search_hybrid(self, query_text: str, query_embedding: list, filters: dict, top_k: int = 5) -> list[str]:
        # expr filter: build boolean expression từ filters dict
        # Stretch: AnnSearchRequest + RRFRanker
        ...
```
