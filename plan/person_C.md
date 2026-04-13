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
- Hoàn thiện `src/core/db_clients/milvus.py` (skeleton đã có sẵn `connect/insert/search`).
- `insert()` + `collection.flush()` phải stable với corpus 10K chunks.
- **FAIRNESS BẮT BUỘC:** Đọc `INDEX_PARAMS` từ `src.config` và pass vào HNSW
  index_params `{"metric_type": INDEX_PARAMS["metric"], "index_type": "HNSW",
  "params": {"M": INDEX_PARAMS["M"], "efConstruction": INDEX_PARAMS["ef_construction"]}}`
  + search_params `{"params": {"ef": INDEX_PARAMS["ef_search"]}}`. KHÔNG HARDCODE.
- **NHIỆM VỤ CỐT LÕI:** Hoàn thiện `search_hybrid()` — dùng `expr` cho Boolean
  filter (vd `"category == 'tech' and year > 2023"`). Stretch: `AnnSearchRequest`
  + `RRFRanker` cho hybrid thực sự.
- **PHỐI HỢP A:** Chạy `run_accuracy_benchmark` validate Recall — nếu lệch so
  với Qdrant/Weaviate >5% thì kiểm tra lại index params hoặc consistency level.

### Tuần 3: Giám Sát Tài Nguyên & Đo lường Recall@K
- Kích hoạt Python code đo lường thời gian đáp ứng đẩy hàng loạt `milvus_ingest_ms`.
- Lắng nghe sự kiện RAM Spike khi kích hoạt `load()` data.
- Phối hợp với Thành viên A chạy Evaluator: Benchmark xem bộ lọc `expr` của Milvus xử lý cực nhanh ra sao ở quy mô lớn, và so sánh Latency giữa chế độ Vector Only vs. Biểu thức expr rắc rối.

### Tuần 4: Sắp Xếp Trình Bày Document & Video Demo
- Viết báo cáo chuyên sâu về sự đánh đổi giữa cấu trúc phân tán (Distributed Log-broker) cồng kềnh với tốc độ siêu việt của bộ lọc Boolean. Trình bày tại sao điểm DX Score của Milvus có thể cao (khó dùng) nhưng Accuracy và Throughput lại bù đắp hoàn hảo.
- Khảo cứu đưa ra thực trạng thị trường: Số stars trên Github, mô hình kiếm tiền theo License của sản phẩm, hệ thống Cloud hiện hành.
- Sắp xếp và triển khai Quay Video Demo mạch lạc nhất đối với phiên thực thi của riêng Milvus trong hệ thống RAG Ràng Buộc, bảo đảm luồng UI thực thi rõ ràng mà ko dồn dập lỗi môi trường.

## 3. Chỉ số Kỹ thuật Cần Đạt (KPIs)
- Hoàn thiện lập chỉ mục, việc Search() diễn ra phản hồi bình thường sau thủ tục Load(), hệ thống hiển thị rành mạch `Index Ready`.
- Cung cấp chính xác biến đo lường tốc độ tính theo `vectors/sec`, tính toán rạch ròi tỉ lệ ăn CPU theo core khi thực thi truy vấn HNSW.
- Lưu ý rủi ro tài nguyên Milvus có thể yêu cầu nhiều GB disk và Ram (tại `./volumes/milvus_data`), phải set limit memory trên yaml hợp logic.
