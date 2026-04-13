# Báo Cáo Seminar Big Data: Benchmarking Qdrant, Weaviate & Milvus

Dự án này là hệ thống triển khai Retrieval-Augmented Generation (RAG) nhằm đánh giá và so sánh hiệu năng của 3 hệ quản trị Vector Database đại diện cho mảng Big Data: **Qdrant (Rust)**, **Weaviate (Go)**, và **Milvus (C++)**. Hệ thống được thiết kế với giao diện chuẩn mực do Thành viên A (Lê Xuân Trí) chịu trách nhiệm kiến trúc.

## Nhóm Thực Hiện
- **A. Lê Xuân Trí**: Kiến trúc sư RAG & Phát triển Giao diện Streamlit (UI/UX).
- **B. Nguyễn Hồ Anh Tuấn**: Chuyên viên Quản trị Weaviate.
- **C. Trần Hữu Kim Thành**: Chuyên viên Quản trị Milvus.
- **D. Trần Lê Trung Trực**: Chuyên viên Quản trị Qdrant.

## Tính Năng Kỹ Thuật
- **Giao Diện Trực Quan**: Streamlit dashboard nền tối, 6 tabs phân tích (Latency / Accuracy / Recall-vs-Latency / Hybrid / Filtering / DX Score).
- **Chế Độ Giả Lập (MOCK_MODE)**: Chạy hoàn toàn offline — embedder & LLM có fallback deterministic, không cần Ollama để dev & demo giao diện.
- **Fairness Protocol**: Tất cả 3 DB dùng chung `INDEX_PARAMS` (HNSW M=16, ef_construction=128, ef_search=64, COSINE) từ `src/config.py` → so sánh apples-to-apples.
- **Ground-Truth Accuracy**: Corpus synthetic 10K chunks (seed cố định), mỗi chunk mang nhãn `[CID:…]` → Recall@1/5/10 + MRR đo bằng exact ID match, không cần LLM-as-judge.
- **Recall vs Latency Pareto Curve**: Sweep `top_k ∈ {1,2,5,10,20,50}` theo kiểu ann-benchmarks.com — biểu đồ chính cho slide thuyết trình.
- **DX Score v2**: SLOC + cyclomatic complexity + public methods + third-party imports → score tổng hợp (thấp = dễ dùng).
- **Telemetry Append-Mode**: `@time_profiler` ghi log O(1) per call vào `metrics.csv`, chịu được stress test dài.

---

## Hướng Dẫn Cài Đặt và Triển Khai

### Yêu Cầu Hệ Thống Khuyên Dùng
- **Python 3.11+**
- **Docker** và **Docker Compose V2**

### Bước 1: Khởi Động Hạ Tầng Cơ Sở Dữ Liệu
Toàn bộ hệ thống 3 Cơ sở dữ liệu và công cụ Ollama (nếu cần) được cấu hình trong một tệp compose thống nhất. Yêu cầu chạy dòng lệnh sau tại thư mục gốc:
```bash
docker compose up -d
```
*(Ghi chú: Quá trình ánh xạ và tải ảnh 3 Container Database có thể mất thời gian. Các cấu hình phần cứng đã được thiết lập giới hạn trong tệp cấu hình yaml để tối ưu tài nguyên của máy chủ host).*

### Bước 2: Thiết Lập Môi Trường Ứng Dụng
Kích hoạt môi trường lập trình python ảo để tránh xung đột cấu hình hệ thống:
```bash
python -m venv venv
# Đối với hệ điều hành Windows:
venv\Scripts\activate
# Đối với hệ điều hành Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
```

### Bước 3: Tuỳ Chỉnh Cấu Hình Giả Lập (Tuỳ Chọn)
Hệ thống được phát triển với tính năng **MOCK_MODE**. Chế độ này giả lập quá trình Vector hóa và tạo kết xuất văn bản của mô hình ngôn ngữ lớn, rất phù hợp khi kiểm tra hệ thống ngoại tuyến (offline).

Thay đổi thiết lập tại file `src/config.py`:
```python
MOCK_MODE = True # Trạng thái False sẽ cấu hình hệ thống kết nối với Ollama để lấy dữ liệu tính toán thực tế.
```

### Bước 4: Thực Thi Hệ Thống RAG
Tại thư mục chứa dự án, thực thi lệnh sau:
```bash
python -m streamlit run src/app/main.py
```
Trình duyệt sẽ tự động điều hướng tới địa chỉ mạng cục bộ.

---

## Quy Trình Đánh Giá Hệ Thống (Benchmarking)

### 1. Demo luồng RAG (cho Video Demo)
1. Vào Sidebar → chọn Database (Qdrant / Weaviate / Milvus).
2. Upload 1 tệp PDF học thuật trong phần *Data Ingestion Pipeline* → bấm **Process & Inject**.
3. Gõ câu hỏi vào ô chat chính → xem câu trả lời có trích context đúng không.

### 2. Benchmark Học Thuật (cho Slide & Báo Cáo)

| Tab | Mục đích | Cách chạy |
| :--- | :--- | :--- |
| **⚡ Latency** | p50/p95 ms của insert/search | Tự động ghi khi có thao tác, hoặc bấm *Run Stress Test* ở Sidebar |
| **🎯 Accuracy** | Recall@1/5/10 + MRR trên synthetic corpus 10K | Tab Accuracy → *Run Accuracy Benchmark* |
| **📈 Recall vs Latency** | Pareto curve sweep `top_k` | Tab Recall vs Latency → *Run Tradeoff Sweep* |
| **👨‍💻 DX Score** | SLOC + cyclomatic + imports | Tab DX Score → *Run DX Analyzer* (tĩnh, không cần DB chạy) |
| **System Resources** | CPU / RAM realtime từng container | Expander *System Resources* → *Refresh Resource Stats* |

### 3. Cấu hình Benchmark
Các biến môi trường điều chỉnh quy mô (đặt trong `.env` hoặc shell):
```bash
BENCH_CORPUS_SIZE=10000   # số chunk synthetic (default 10K)
BENCH_NUM_QUERIES=200     # số golden query (default 200)
BENCH_SEED=42             # seed cố định cho reproducibility
```
Fairness: cả 3 DB phải đọc `INDEX_PARAMS` từ `src/config.py` trong `connect()`.
Không được hardcode HNSW params — PR sẽ bị reject bởi reviewer.

---

*Dự án thuộc học phần Big Data. Cấu trúc chuẩn hoá cho yêu cầu Seminar nghiên cứu khoa học.*
