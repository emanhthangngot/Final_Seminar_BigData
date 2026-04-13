# Kế Hoạch Cá Nhân - Thành Viên A (Lê Xuân Trí)
**Vai trò:** RAG Architect & Frontend UI/UX
**Kỹ năng bổ trợ:** Python Streamlit, LangChain, CSS

## 1. Mục tiêu công việc
Chịu trách nhiệm kiến trúc luồng dữ liệu (RAG), xây dựng giao diện Streamlit, thiết lập pipeline xử lý tài liệu PDF và tổng hợp Dashboard báo cáo Benchmarking giữa 3 hệ quản trị Qdrant, Weaviate, Milvus. Đảm bảo toàn bộ hệ thống tích hợp chạy mượt mà theo cấu trúc Master Plan.

## 2. Phân công chi tiết (Detailed Timeline)

### Tuần 1: Thiết lập Hệ thống Core RAG
- Nghiên cứu và hiện thực logic trích xuất text và quản lý bảng biểu/hình ảnh từ PDF (Module Optional nhưng ưu tiên).
- Khởi tạo thư mục dự án chuẩn theo cấu trúc `src/app/main.py`, `src/config.py`, và thiết lập luồng vận hành bằng GitHub CI/CD cơ bản.
- Lập trình `src/core/data_ingestion/processor.py` sử dụng thư viện LangChain tập trung vào việc đọc chia text PDF ra thành dạng chunks với quy tắc chia ổn định.
- Tích hợp được Ollama API Local nhằm mục đích tạo cơ chế sinh Embeddings miễn phí nhưng hiệu năng cao (sử dụng model `nomic-embed-text` cho embedding kích thước 768 chiều).
- Thiết lập cơ chế `MOCK_MODE` tại `src/core/data_ingestion/generator.py` để đảm bảo hệ thống phản hồi ổn định khi chưa có LLM.

### Tuần 2: Dashboard V2 + Methodology chuẩn hoá
- Xây dựng Layout Streamlit với **6 tabs**: ⚡ Latency / 🎯 Accuracy / 📈 Recall vs Latency / 🔍 Hybrid / ⚙️ Filtering / 👨‍💻 DX Score.
- Triển khai Chat Interface (RAG Agent) cho phép upload PDF thực tế để demo.
- **Thiết kế Fairness Protocol** (điểm ăn Q&A): định nghĩa `INDEX_PARAMS`
  (HNSW M=16, ef_construction=128, ef_search=64, COSINE) trong `src/config.py`
  → broadcast cho B/C/D. Review PR của 3 bạn để đảm bảo họ consume constants
  này (không ai hardcode settings khác).
- **Module `src/core/benchmark/dataset.py`**: synthetic corpus 10K chunks mỗi
  chunk mang nhãn `[CID:NNNNNNN]` + golden queries reproducible.
- **Module `src/core/benchmark/evaluator.py`**: Recall@1/5/10 + MRR với
  ground-truth là Chunk ID exact match (không dùng substring / LLM-as-judge).

### Tuần 3: Benchmark Nâng Cao (Recall-Latency Curve + DX v2)
- **Module `src/core/benchmark/tradeoff.py`**: sweep `top_k ∈ {1,2,5,10,20,50}`
  cho cả 3 DB để vẽ biểu đồ Recall vs Latency kiểu ann-benchmarks.com.
  Điểm càng gần góc trên-trái càng tốt — chart này là **main visual** trong slide.
- **Nâng cấp `src/core/utils/dx_analyzer.py`**: thêm cyclomatic complexity +
  count public methods + count third-party imports → score tổng hợp. SLOC thuần
  quá nông, dễ bị thầy bẻ.
- Dashboard Plotly render mượt với corpus 10K+ (dùng `@st.cache_resource` cho
  embedder/DB clients, không cache kết quả benchmark).
- Hỗ trợ B/C/D debug khi Recall của họ bất thường (sai metric, sai index params).

### Tuần 4: Đóng gói Báo Cáo & Thuyết Trình Seminar
- Là người thiết kế Slide thuyết trình, đảm bảo Slide phản ánh được Trade-offs CỦA 4 TRỤ CỘT: Latency, Accuracy, Filtering, và DX Matrix.
- Phối hợp thành viên thiết kế các hình học minh hoạ (Architecture Diagram) theo chuẩn The Big Data Trio. 
- Định hình lộ trình Demo Video, quản lý luồng kịch bản khi quay demo.

## 3. Chỉ số Kỹ thuật Cần Đạt (KPIs)
- `evaluator.py`: Tính đúng Recall@1/5/10 + MRR bằng exact chunk-ID match trên corpus ≥ 10K.
- `tradeoff.py`: Sinh được DataFrame (Engine, top_k, Recall, AvgLatency_ms) → vẽ curve Plotly.
- `main.py`: 6 tabs chạy mượt, Accuracy + Tradeoff tabs có progress bar thời gian thực, không treo UI khi corpus 10K.
- `dx_analyzer.py`: Complexity Score gồm ≥ 4 signals (sloc, methods, cyclomatic, third_party_imports).
- `config.py`: Export `INDEX_PARAMS` để B/C/D dùng chung → đảm bảo fairness.
