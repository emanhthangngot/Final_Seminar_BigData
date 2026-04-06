# PERSON A: Lê Xuân Trí - RAG Architect & Frontend UI/UX

## Cá nhân chịu trách nhiệm: Lê Xuân Trí

- **Vai trò:** Kiến trúc sư hệ thống RAG, phát triển luồng xử lý dữ liệu và giao diện người dùng.
- **Mục tiêu:** Xây dựng hệ thống ổn định, tích hợp LLM và hiển thị Benchmarking trực quan.

## 1. Phân công nhiệm vụ chi tiết (Detailed Task Breakdown)

| Giai đoạn | Công việc chi tiết | Phương thức thực hiện | Kết quả đầu ra cụ thể |
| :--- | :--- | :--- | :--- |
| **Giai đoạn 1** | Xây dựng pipeline xử lý PDF & Embedding | Sử dụng `PyPDFLoader` & `RecursiveCharacterTextSplitter` | File `processor.py` và `embedder.py` ổn định |
| **Giai đoạn 1.2** | Kết nối Ollama API Local | Gọi `OllamaEmbeddings` từ LangChain | Vector chuẩn 768 chiều cho mọi chunk |
| **Giai đoạn 2** | Dashboard Streamlit & Chatflow | Sử dụng `st.chat_message`, `st.sidebar` | Giao diện Chatbot có Sidebar chọn DB & Top-K |
| **Giai đoạn 2.2** | Xây dựng Prompt Engineering | System prompt tối ưu cho Qwen3.5 | Câu trả lời từ LLM bám sát nội dung PDF |
| **Giai đoạn 3** | Công cụ đo lường & Biểu đồ Plotly | Tích hợp dữ liệu từ `metrics.csv` | Dashboard hiển thị Bar/Radar Chart tương tác |
| **Giai đoạn 3.2** | Stress Test luồng Ingestion | Chạy thử với tệp PDF 100+ trang | Lưu log thời gian xử lý toàn hệ thống |
| **Giai đoạn 4** | Đóng gói Code & Slide Canva | Kiểm tra tính nhất quán thư mục `src/` | Repo Github sạch sẽ & Slide thuyết trình |

## 2. Đầu ra mong đợi kỹ thuật (Technical Deliverables)

| Sản phẩm | Thông số kỹ thuật yêu cầu | Chỉ số KPI đánh giá |
| :--- | :--- | :--- |
| **Pipeline Xử lý** | `chunk_size: 1000`, `overlap: 200` | Tỷ lệ trích xuất text thành công 100% |
| **LLM Orchestration** | Gọi được Qwen3.5 local qua Ollama | Thời gian sinh câu trả lời (TTFT) < 1.5s |
| **Visualization** | Vẽ được biểu đồ Radar so sánh 3 tiêu chí | Hiển thị rõ RAM Spike & Search Latency |

## 3. Quản lý Rủi ro & Cách khắc phục (Risk Mitigation)

| Rủi ro | Giải pháp phòng ngừa | Thao tác khắc phục |
| :--- | :--- | :--- |
| **Lỗi Dimension (768)** | Luôn `assert length == 768` sau Embedding | Restart Ollama server và xóa collection cũ |
| **Tràn RAM của LLM** | Giới hạn `max_tokens` của Qwen3.5 | Tắt các application không cần thiết trên OS host |
| **Lỗi Encoding văn bản** | Sử dụng `utf-8` khi đọc & ghi payload | Dùng hàm `helpers.clean_text()` để chuẩn hóa |

## 4. Checklist thực hiện chuyên sâu

- [x] Lập sơ đồ kiến trúc luồng RAG kết nối 3 DB.
- [ ] Implement `PDFProcessor` hỗ trợ đọc nhiều file cùng lúc.
- [ ] Thiết lập file `config.py` dùng chung cho toàn đội (Port, Model).
- [ ] Viết logic quản lý `st.session_state` cho lịch sử hội thoại.
- [ ] Xây dựng bộ biểu đồ so sánh Hiệu năng (Speed) và Tài nguyên (RAM).
- [ ] Kiểm tra tính tương thích của `requirements.txt` trên môi trường sạch.

## 5. Đoạn mã giao tiếp mong đợi

```python
# src/data_ingestion/processor.py
class RAGDataOrchestrator:
    def __init__(self, model="nomic-embed-text"):
        self.embed_client = OllamaEmbeddings(model=model)
        
    def run_pipeline(self, pdf_file):
        # 1. Trích xuất -> 2. Chia nhỏ -> 3. Embedding -> 4. Giao cho DB Client
        pass
```
