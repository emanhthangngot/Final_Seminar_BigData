# BẢN KẾ HOẠCH TỔNG THỂ (MASTER PLAN)

## 1. Bối cảnh dự án & Kiến thức nền tảng (Knowledge Base)
Dự án này tập trung xây dựng một hệ thống **Retrieval-Augmented Generation (RAG)** tiên tiến, được thiết kế không chỉ để tạo ra một ứng dụng Hỏi & Đáp tài liệu, mà còn để đặt 3 hệ quản trị Vector Database hàng đầu hiện nay: **Qdrant**, **Weaviate**, và **Milvus** lên bàn cân so sánh (Benchmarking) một cách thực chứng nhất.

Để đạt được điểm số tuyệt đối, toàn bộ đội ngũ kỹ sư phải thấu hiểu sâu sắc các khái niệm lõi sau:
- **Vector Database vs CSDL Truyền Thống:** RDBMS (SQL) hay Document DB (MongoDB) lưu trữ dữ liệu theo hàng/cột hoặc JSON, được tối ưu hoá cho truy vấn "khớp chính xác" (exact match). Trong khi đó, hệ thống AI cần hiểu được "ngữ nghĩa". Chữ "Chó" và chữ "Mèo" không hề giống nhau về mặt ký tự, nhưng lại rất gần nhau về mặt ngữ nghĩa (đều là thú cưng). Vector DB ra đời để sinh ra, lưu trữ và lập chỉ mục các toạ độ không gian đa chiều (thường là 1536 chiều với model của OpenAI) này.
- **Quy trình Embedding:** Là quá trình biến đổi dữ liệu phi cấu trúc (Văn bản PDF, Word, Ảnh) thành các mảng số thực (Float Arrays). Vectơ càng giống nhau thì dữ liệu gốc mang ý nghĩa càng tương đồng.
- **Thước đo độ tương đồng (Similarity Metrics):**
  - *Cosine Similarity:* Đo lường góc giữa hai vectơ. Đây là thước đo phổ biến và chuẩn xác nhất cho text embedding vì nó bỏ qua độ dài (độ lớn) của vectơ mà chỉ quan tâm tới chiều hướng ngữ nghĩa.
  - *Euclidean Distance (L2):* Khoảng cách vật lý đoạn thẳng giữa hai điểm trong không gian. Thường dùng cho các model embedding âm thanh hoặc hình ảnh chuyên biệt.
  - *Dot Product (Tích vô hướng):* Nếu các vectơ đã được chuẩn hoá (Normalized), Dot Product trả về kết quả y hệt Cosine nhưng có tốc độ tính toán phần cứng nhanh hơn nhiều.
- **Thuật toán Approximate Nearest Neighbor (ANN):** Tìm kiếm rà soát toàn bộ DB (K-Nearest Neighbor) là quá chậm. Vector DB sử dụng ANN để hy sinh một chút độ chính xác (khoảng 1-2%) nhằm đổi lấy tốc độ truy vấn tăng hàng ngàn lần. Cụ thể nhóm sẽ phân tích thuật toán cấu trúc đồ thị **HNSW (Hierarchical Navigable Small World)** đang được Qdrant và Milvus sử dụng làm cốt lõi.

### Phương pháp Benchmarking
Để slide có tính thuyết phục tuyệt đối, chúng ta đo lường:
1. **Ingestion Time (Thời gian Nạp Dữ Liệu):** Đẩy 1 file PDF học thuật dài 500 trang qua chuẩn hoá và đo xem DB nào tiếp nhận và lập chỉ mục (Index) nhanh nhất tính bằng mili-giây (ms).
2. **Query Latency (Độ trễ Truy Vấn):** Thời gian cần thiết kể từ khi gửi câu hỏi đến khi DB trả về Top 5 đoạn văn bản tương đồng nhất.
3. **Resource Consumption (Tài nguyên Tiêu thụ):** Sử dụng OS command `docker stats` chụp lại sự thay đổi biến thiên của RAM (Memory) và CPU giữa lúc DB rảnh rỗi và lúc đang bị đẩy tải rà soát.
4. **Developer Experience (Trải nghiệm Dev):** Độ khó/Dễ của bộ SDK Python đi kèm mỗi DB.

---

## 2. Kiến trúc Hệ Thống Dữ Liệu (System Architecture)
Hệ thống được thiết kế theo mô hình Micro-Architecture, chia tách lớp (Layer) hoàn toàn độc lập giúp dễ dàng tráo đổi (swap) giữa 3 DB mà không làm sập Logic của web.
1. **Frontend UI Layer:** Giao diện Streamlit xử lý việc upload file PDF, thanh Sidebar chọn DB, và các biểu đồ phân tích tương tác.
2. **Data Processing Pipeline:** LangChain nhận file, dùng thuật toán `RecursiveCharacterTextSplitter` chặt cắt dữ liệu dài thành các Chunk (khoảng 1000 ký tự) đan xen nhau (overlap 200 ký tự) để giữ nguyên văn cảnh.
3. **Database Abstraction Layer:** Tất cả các thao tác gọi tới Qdrant/Weaviate/Milvus đều phải chui qua một interface chuẩn `BaseVectorDB`, đảm bảo tính thống nhất trong code base.
4. **Retrieval & LLM Binding:** Câu hỏi người dùng được embedding -> Pass qua DB interface -> Trả về context -> Nhồi context này cùng user query vào Prompt Template -> Đẩy lên OpenAI API/Ollama để sinh ra câu trả lời cuối cùng bằng ngôn ngữ tự nhiên.

---

## 3. Cấu trúc Codebase Chuẩn Hóa
Toàn bộ dự án phải tuân thủ nghiêm ngặt Folder Structure sau:
```text
project/
├── docker-compose.yml         # Thiết lập container cho cả 3 DB
├── requirements.txt           # Quản lý Package (Streamlit, Langchain, PyMilvus, Weaviate, Qdrant...)
├── src/
│   ├── app.py                 # File chạy chính của Giao diện
│   ├── data_ingestion/
│   │   └── processor.py       # Nơi chứa hàm băm/chặt/đọc file PDF
│   ├── db_clients/
│   │   ├── base_client.py     # Nơi định nghĩa Abstract Interface bắt buộc cho A,B,C,D
│   │   ├── qdrant_client.py   # Lớp xử lý riêng của Person D
│   │   ├── weaviate_client.py # Lớp xử lý riêng của Person B
│   │   └── milvus_client.py   # Lớp xử lý riêng của Person C
│   └── benchmark/
│       └── monitor.py         # Hàm đếm giờ, lưu csv, vẽ biểu đồ
```

**Ví dụ thiết kế Interface bắt buộc (Design Pattern):**
```python
from abc import ABC, abstractmethod

class BaseVectorDB(ABC):
    @abstractmethod
    def connect(self): 
        '''Khởi tạo kết nối tới Docker Instance và định nghĩa/tạo Database Schema'''
        pass
    
    @abstractmethod
    def insert(self, chunks: list, embeddings: list, metadata: list): 
        '''Nhận list text và list mảng float, ép kiểu và đẩy qua network tới DB'''
        pass
    
    @abstractmethod
    def search(self, query_embedding: list, top_k: int) -> list: 
        '''Trả về đúng định dạng danh sách các cụm chuỗi text matching nhất'''
        pass
```

---

## 4. Lộ trình Triển khai (Timeline 4 Tuần)

### Tuần 1: Cấu trúc hạ tầng & Xây dựng Pipeline Nạp Data (Ingestion)
**Mục tiêu:** Cả 4 thành viên phải run thành công môi trường Local. Project có thể băm nhỏ PDF và đẩy Dữ liệu nộm (Dummy data) thành công vào cả 3 DBs không sinh lỗi.
- **Phiên 1.1:** Setup Github Repo. Định hình `docker-compose.yml` nhét cả 3 ông tướng Milvus, Weaviate, Qdrant vào chạy song song. Map Port cẩn thận tránh đụng nhau.
- **Phiên 1.2:** Định nghĩa Base Class Interface. Implement Langchain components đọc PDF thành String List.
- **Phiên 1.3:** Các bạn DB (B, C, D) code phần `connect()` của base class tương ứng với từng tool.
- **Phiên 1.4:** Code hàm `insert()` hoàn chỉnh. Chạy file python test lưu lượng xem file PDF đã vào DB thực chưa thông qua UI của DB đó.

### Tuần 2: Xây dụng Giao diện RAG & Analytics UI (ĐỘC QUYỀN PERSON A)
**Mục tiêu:** Person A (Trí) thiết kế toàn bộ App Streamlit. Người dùng có thể nhấn nút, chọn tool và chat.
- **Phiên 2.1:** Chia cột (layout) Streamlit. Tạo Slider/Dropdown Sidebar.
- **Phiên 2.2:** Tích hợp file Uploader, hook vào hàm `processor.py` để xử lý ngay trên UI.
- **Phiên 2.3:** Dựng form Chat, móc nối lịch sử `session_state`. Tạm thời echo lại lời user cho tới khi backend query xong.
- **Phiên 2.4:** Thiết kế giao diện Expander "Báo cáo Benchmark", gọi thư viện Plotly Express để ăn các data CSV (Đang để dummy) chập thành biểu đồ.

### Tuần 3: Tích hợp Thuật toán Tìm Kiếm & Lấy Metric (ĐỘC QUYỀN PERSON B, C, D)
**Mục tiêu:** Hoàn thiện 100% logic Tìm kiếm, nối Chatbot AI vào, và vắt kiệt phần cứng để lấy các con số mili-giây hiệu năng.
- **Phiên 3.1:** Từng DB Specialist hoàn thành hàm `search()`. Khởi tạo HNSW Index và viết mapping để lấy mảng Float lọc ra câu chữ (Text Payload).
- **Phiên 3.2:** Tích hợp Context lấy được ở 3.1 vào thẳng hàm RAG Prompt, đưa lên OpenAI. Test chat bot hỏi câu hỏi bất kỳ, đảm bảo kiến thức lấy đúng từ PDF.
- **Phiên 3.3:** Viết hàm Timer Profile (đo thời gian). Chạy vòng lặp 100 câu query để ra latency trải đều. Đổ dữ liệu xuất ra `benchmark/metrics.csv`.
- **Phiên 3.4:** Đọc OS log RAM qua Terminal, chụp ảnh màn hình hiện trạng bộ test.

### Tuần 4: Đóng gói Báo cáo & Luyện tập Thuyết trình (Toàn team)
**Mục tiêu:** Báo cáo bản cứng, Slideshow và chuẩn bị phản biện xuất sắc.
- **Phiên 4.1:** Test E2E toàn bộ hệ thống. Trí đẩy code cuối lên Github.
- **Phiên 4.2:** Viết Report theo đúng format Word (10-15 trang, Times New Roman, dãn dòng 1.5).
- **Phiên 4.3:** Làm Slide (30 phút total): 5p Giới thiệu (Vấn đề DB cũ), 10p mổ xẻ kiến trúc 3 con, 10p show Demo Video & Phân tích Biểu đồ Benchmark, 5p Q&A.
- **Phiên 4.4:** Zip Source Code, viết `README.md` cài đặt một cú click `docker compose up`, nộp bài.

---

## 5. Quy tắc Quản lý Rủi ro & Fallback
- **Tuần 1 (Đụng chạm Port Docker):** Milvus chiếm port `19530`, Weaviate chiếm `8080`, Qdrant chiếm `6333`. Phải set explicitly trong Compose file. Nếu máy ảo/laptop RAM thấp, hạ cấu hình container.
- **Tuần 2 (Streamlit Reload):** Streamlit chạy lại code từ đầu sau mỗi cú click. Nếu mất API Key hoặc DB Connection bị reset, lập tức dùng cờ `@st.cache_resource` để khóa bộ nhớ đối tượng kết nối.
- **Tuần 3 (Rate Limit OpenAI):** Nếu đẩy file 500 trang đi Embedding, API OpenAI có thể bóp băng thông (Rate limit 429). Giải pháp: Dùng `HuggingFaceEmbeddings` chạy mô hình open-source siêu nhẹ tại máy cục bộ (như `all-MiniLM-L6-v2`) để test.
- **Tuần 4 (Live Demo bị nổ tung):** Khởi tạo Docker DB trên giảng đường có thể tốn thời gian, hoặc mạng trường yếu gây đứt gãy API LLM. Khắc phục: YÊU CẦU quay màn hình toàn bộ thao tác RAG thành 1 video mp4 dài 2 phút gắn vào slide show.

---

## 6. Danh sách Bàn Giao (Deliverables)
- Cuối Tuần 1: Repo Github có cấu trúc xịn, file `docker-compose.yml` bật cái lên luôn 3 Engine.
- Cuối Tuần 2: Ứng dụng Streamlit có thể chạy với UI đẹp mắt.
- Cuối Tuần 3: Chatbot RAG trả lời chính xác và file `metrics.csv` điền đầy đủ dữ liệu thời gian.
- Cuối Tuần 4: Slide nộp trước 3 ngày, Bản Báo cáo Word 15 trang cực kỳ hàn lâm nộp đúng Deadline.
