# Kế Hoạch Cá Nhân - Thành Viên A (Lê Xuân Trí)
**Vai trò:** RAG Architect & Frontend UI/UX
**Kỹ năng bổ trợ:** Python Streamlit, LangChain, CSS

## 1. Mục tiêu công việc
Chịu trách nhiệm kiến trúc luồng dữ liệu (RAG), xây dựng giao diện Streamlit, thiết lập pipeline xử lý tài liệu PDF và tổng hợp Dashboard báo cáo Benchmarking giữa 3 hệ quản trị Qdrant, Weaviate, Milvus. Đảm bảo toàn bộ hệ thống tích hợp chạy mượt mà theo cấu trúc Master Plan.

## 2. Phân công chi tiết (Detailed Timeline)

### Tuần 1: Thiết lập Hệ thống Core RAG
- Nghiên cứu và hiện thực logic trích xuất text và quản lý bảng biểu/hình ảnh từ PDF (Module Optional nhưng ưu tiên).
- Khởi tạo thư mục dự án chuẩn theo cấu trúc `src/app.py`, `src/config.py`, và thiết lập luồng vận hành bằng GitHub CI/CD cơ bản.
- Lập trình `processor.py` sử dụng thư viện LangChain tập trung vào việc đọc chia text PDF ra thành dạng chunks với quy tắc chia ổn định.
- Tích hợp được Ollama API Local nhằm mục đích tạo cơ chế sinh Embeddings miễn phí nhưng hiệu năng cao (sử dụng model `nomic-embed-text` cho embedding kích thước 768 chiều).

### Tuần 2: Xây triển Giao diện & Data Orchestration 
- Xây dựng Layout Streamlit bao gồm Menu điều hướng Tabs, Sidebar và Cấu hình parameter.
- Triển khai chức năng Chat Interface giúp người dùng thao tác tương tác như 1 Agent, cho phép đính kèm tệp PDF lên server cục bộ.
- Xây dựng phần Prompt Generation & điều phối LLM Pipeline. Viết Code tiếp nhận Vector Documents lấy về từ 3 Database, thiết kế Context chuẩn xác để mô hình LLM Qwen3.5 đọc hiểu và trả lời ngôn ngữ tự nhiên. 

### Tuần 3: Xây dựng Benchmarking Dashboard Analytic
- Tập trung đo sự hiệu quả của Ingestion Time (Toàn bộ thời gian xử lý E2E) từ khi User tải file PDF đến lúc Vector được nhúng hoàn toàn vào Database.
- Thiết kết phần Backend thu thập dữ liệu chỉ số log thô vào file log trung tâm `metrics.csv`.
- Tận dụng `Plotly/Altair` dựng hệ thống Dashboard hiển thị so sánh động Bar Chart và Radar Chart biểu thị cho Latency của 3 CSDL cũng như tính ổn định thông lượng.

### Tuần 4: Đóng gói Báo Cáo & Thuyết Trình Seminar
- Là người thiết kế Slide thuyết trình, đảm bảo Slide phản ánh được Trade-offs của 3 vector DB thông qua Biểu đồ so sánh thời gian và tài nguyên thay vì nhồi nhét cấu hình.
- Phối hợp thành viên thiết kế các hình học minh hoạ (Architecture Diagram). 
- Định hình lộ trình Demo Video, quản lý luồng kịch bản khi quay demo tránh dư thừa các màn khởi động Server.

## 3. Chỉ số Kỹ thuật Cần Đạt (KPIs)
- Lớp Object `processor.py`: Trích xuất thành công nội dung chữ chuẩn tiếng Việt từ PDF. Output trung bình của độ dài chunks ở mức `1000` chars/chunk.
- Lớp Ứng dụng `app.py`: Streamlit rendering mượt mà, quá độ chuyển trạng thái DB trơn tru, Load time dưới 2 giây. Tích hợp trực quan đẹp mắt và chuyên nghiệp.
- Mọi vector gửi vào Database phải chính thức đi qua Validate định dạng hàm Dimension bằng 768.
