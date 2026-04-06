# TEAM INTEGRATION & SYNC STRATEGY

## Tổng quan tích hợp

Dự án RAG Benchmarking yêu cầu sự phối hợp chặt chẽ giữa 4 thành viên để đảm bảo tính nhất quán của dữ liệu (768-dim) và hiệu năng của hệ thống. Tài liệu này hướng dẫn cách thức tích hợp code và xử lý các lỗi phát sinh.

## 1. Bản thống nhất kỹ thuật (Technical Specs Consensus)

| Hạng mục | Quy chuẩn bắt buộc | Ghi chú |
| :--- | :--- | :--- |
| **Dimension Pact** | **768** chiều | `nomic-embed-text` |
| **Data Flow** | PDF -> Processor -> Embedding -> DB | Chuỗi xử lý tuần tự |
| **Ollama Host** | `http://localhost:11434` | Phải chạy local |
| **Return Type** | `List[str]` | Chỉ trả về text nguyên bản |

## 2. Rủi ro tích hợp & Giải pháp (Integration Risks)

> [!CAUTION]
> **Docker Port Conflict:** 19530 (Milvus), 8080 (Weaviate), 6333 (Qdrant). Tránh thay đổi port để không làm gãy kết nối từ `app.py`.
> **OOM (Out of Memory):** Nếu chạy cả 3 DB + Embedding + LLM, RAM có thể vượt 8GB. Giải pháp: Tắt các database không dùng đến khi bench database khác.
> **Schema Conflict:** Các thành viên B, C, D cần đặt tên Collection khác nhau hoặc xóa cũ tạo mới khi khởi động để tránh rác dữ liệu.

## 3. Kịch bản Demo Seminar Chi tiết (Live Demo Playbook)

| Thời gian | Hành động cụ thể | Phụ trách | Kết quả mong đợi |
| :--- | :--- | :--- | :--- |
| **T-10m** | Kiểm tra kết nối Docker & Ollama | Toàn đội | 3 DB Ready, Ollama live |
| **00:00** | Giới thiệu Kiến trúc & Mục tiêu | A | Khán giả hiểu luồng RAG |
| **05:00** | Upload PDF & Ingestion Demo | B, C, D | Log nạp hiển thị trên UI |
| **15:00** | Phân tích biểu đồ Benchmarking | Toàn đội | Biểu đồ Radar so sánh trực quan |
| **25:00** | Câu hỏi thực tế (Chatbot RAG) | A | LLM trả lời đúng dựa trên PDF |

## 4. Kế hoạch đồng bộ Code (Sync Schedule)

- **Daily Sync (15 phút):** Cập nhật các thay đổi trong `BaseVectorDB` interface.
- **Integration Milestone (Tuần 3):** Ghép nối thử nghiệm 3 client DB vào giao diện Streamlit.
- **Dry Run (Tuần 4):** Quay video demo dự phòng (Fallback) phòng trường hợp mạng/phần cứng lỗi.

---

## Checklist Tích hợp Nhóm

- [x] Thống nhất file `docker-compose.yml` duy nhất tại root.
- [ ] Kiểm tra tính kế thừa của `BaseVectorDB` trong từng file client.
- [ ] Chạy thử file `app.py` với tính năng chuyển đổi DB linh hoạt (Switching).
- [ ] Đảm bảo file `metrics.csv` được ghi đúng định dạng để vẽ biểu đồ.
