# Báo Cáo Seminar Big Data: Benchmarking Qdrant, Weaviate & Milvus

Dự án này là hệ thống triển khai Retrieval-Augmented Generation (RAG) nhằm đánh giá và so sánh hiệu năng của 3 hệ quản trị Vector Database đại diện cho mảng Big Data: **Qdrant (Rust)**, **Weaviate (Go)**, và **Milvus (C++)**. Hệ thống được thiết kế với giao diện chuẩn mực do Thành viên A (Lê Xuân Trí) chịu trách nhiệm kiến trúc.

## Nhóm Thực Hiện
- **A. Lê Xuân Trí**: Kiến trúc sư RAG & Phát triển Giao diện Streamlit (UI/UX).
- **B. Nguyễn Hồ Anh Tuấn**: Chuyên viên Quản trị Weaviate.
- **C. Trần Hữu Kim Thành**: Chuyên viên Quản trị Milvus.
- **D. Trần Lê Trung Trực**: Chuyên viên Quản trị Qdrant.

## Tính Năng Kỹ Thuật
- **Thiết Kế Giao Diện Trực Quan**: Giao diện Streamlit được thiết kế với nền tối (Deep Black), màu nhấn Xanh/Tím hiện đại, tuân thủ các nguyên tắc thiết kế UI/UX tiêu chuẩn quốc tế.
- **Chế Độ Giả Lập (MOCK_MODE)**: Khả năng chạy Offline giả lập mô hình ngôn ngữ lớn (LLM) và thuật toán nhúng (Embeddings) để đảm bảo không phát sinh chi phí API trong quá trình tinh chỉnh giao diện và kiểm thử luồng dữ liệu.
- **Hệ Thống Giám Sát Hiệu Năng (Telemetry Dashboard)**: Bảng điều khiển Plotly thu thập và trực quan hoá trực tiếp các thông số Thời Gian Nạp Dữ Liệu (Ingestion Time), và Độ Trễ Truy Vấn (Latency) để so sánh 3 hệ quản trị một cách công bằng minh bạch.

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

## Quy Trình Đánh Giá Hệ Thống Chuyên Sâu (Benchmarking)

1. Truy cập thanh điều hướng bên lề (Sidebar). Bắt buộc chọn đúng Database cần kiểm thử nghiệm (Qdrant, Weaviate, hoặc Milvus).
2. Tại trình quản lý nạp dữ liệu (Data Ingestion Pipeline), Tải tệp dữ liệu PDF học thuật lên máy chủ ứng dụng.
3. Chờ tiến trình xử lý văn bản (Load - Split - Chunk) hoàn tất và Cơ sở dữ liệu xác nhận thành công.
4. Tương tác với giao diện hỏi đáp chính bằng khung văn bản truy vấn. 
5. Thong qua he thong thu thap `@time_profiler`, moi so do thoi gian thuc tien cua thao tac Insert hay Search se duoc tong hop tu dong vao log tai `src/core/benchmark/metrics.csv`.
6. Mo rong thanh dieu huong "Performance Telemetry" o cuoi khung hien thi de theo doi bieu dien ma tran radar cua suc manh cau truc co so du lieu.
7. Mo rong panel "System Resources (Docker Containers)" de do CPU va RAM tieu thu cua tung Container Database theo thoi gian thuc.
8. Su dung chuc nang "Stress Test" tai Sidebar de tu dong chay nhieu vong Insert/Search tren tat ca cac Database cung luc va so sanh ket qua.

---

*Dự án thuộc học phần Big Data. Cấu trúc chuẩn hoá cho yêu cầu Seminar nghiên cứu khoa học.*
