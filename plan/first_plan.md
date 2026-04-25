# Kế Hoạch Thực Hiện Seminar: A triple of Vectorstore (Qdrant, Weaviate, Milvus)
**Mục tiêu:** Điểm tuyệt đối (10/10) - Báo cáo chuyên sâu, thuyết trình diễn đạt trực quan, và có Project thực tế dùng để so sánh (Benchmarking) có tính chứng minh cao.

## Phần 1: Phân Tích Yêu Cầu & Quy Định Khoá Học
- **Thời lượng:** 30 phút trình bày + 15 phút Q&A. Bài trình bày cần được phân bổ thời gian hợp lý cho từng thành viên (bắt buộc mọi người đều phải nói).
- **Phạm vi đối tượng:** Sinh viên trong lớp phần lớn chưa có kinh nghiệm về Vector DB -> **Slide phải cực kỳ trực quan**, sử dụng ví dụ gần gũi (ví dụ quy đổi chữ/chó mèo thành điểm trên đồ thị toạ độ để tìm hàng xóm), tránh đặt quá nhiều text.
- **Tiêu chuẩn báo cáo:** 10-15 trang, Times New Roman 12, giãn dòng 1.5. Cần dùng văn phong học thuật, và phải tự tổng hợp (không dịch máy hay copy nguyên văn).
- **Sản phẩm nộp (sau 1 tuần):** Slide, Báo cáo (Word/PDF), Nguồn tham khảo, Source code, Video Demo. (Slide phải nộp trước 3 ngày).

## Phần 2: Lộ Trình Tìm Hiểu Kiến Thức (Từ Cơ Bản Đến Chuyên Sâu)

### 2.1. Nền tảng về Vector Database (Cơ bản)
Cả nhóm cần nắm vững trước khi đi vào từng giải pháp:
- **Vector Database là gì?** Tại sao hệ quản trị CSDL truyền thống (Relational, Document) không phục vụ tốt kỷ nguyên AI/LLM?
- **Khái niệm Vector Embeddings:** Cách chuyển đổi Dữ liệu phi cấu trúc (Văn bản, Hình ảnh, Âm thanh) thành số.
- **Đo lường độ tương đồng (Similarity Metrics):** Cosine, Dot Product, Euclidean.
- **Thuật toán cốt lõi (Algorithm):** Tìm kiếm xấp xỉ ANN (Approximate Nearest Neighbor), điển hình là HNSW và IVF.

### 2.2. Phân tích Chuyên sâu 3 Hệ Quản Trị Vector
Nghiên cứu kiến trúc và điểm mạnh độc tôn của từng tool:

| Tiêu chí | Qdrant | Weaviate | Milvus |
|--- |--- |--- |--- |
| **Mã nguồn mở & Bản quyền** | Apache 2.0 | BSD-3 | Apache 2.0 |
| **Bảng giá (Cloud/Self-host)**| Self-host hoàn toàn miễn phí. Qdrant Cloud có Free tier vĩnh viễn (1GB RAM, 1 node). | Self-host miễn phí vĩnh viễn. Sandbox Cloud Cloud trải nghiệm 14 ngày. | Self-host miễn phí. Zilliz Cloud cung cấp Free tier (2 collections, 1 triệu vectors max). |
| **Độ phổ biến (Big Data)** | Đang nổi lên cực nhanh (~20K+ Github Stars), là xu hướng mới cho RAG siêu tốc tại các startup. | Rất phổ biến (~10K+ Stars), cộng đồng dev đông đảo, thường tích hợp sâu trong các AI framework. | Chuẩn công nghiệp Big Data (~27K+ Stars), dùng bởi các tập đoàn lớn (eBay, Shopee, Tencent...). |
| **Kiến trúc & Ngôn ngữ** | Viết bằng thư viện Rust => Zero-cost abstraction, siêu nhanh, tối ưu bộ nhớ RAM sát ván. | Viết bằng Go => Dễ phân tán, quản lý bộ nhớ qua GC, tối ưu cực tốt cho môi trường microservices. | Lõi C++ & Go, chia nhỏ thành coordinator/worker/storage node => Kiến trúc phân tán (Distributed) thực thụ. |
| **Tính năng "Ăn tiền"** | **Binary Quantization:** Thuật toán nén vector tới 40 lần nhưng giữ độ chính xác. Tối ưu Storage. | **Module Ecosystem:** Tích hợp trực tiếp các models (OpenAI, HuggingFace) rât rành mạch. Có multi-modal. | **GPU Acceleration:** Tăng tốc tìm kiếm bằng GPU (bản nâng cấp). Khả năng Scale đến hàng Tỷ vector. |
| **Dành cho ai?** | Khởi nghiệp, công ty cấu hình phần cứng eo hẹp cần tốc độ truy vấn cao nhất. | Dev muốn xây App AI cực nhanh, đỡ viết logic nhúng và tích hợp mô hình vì Weaviate lo hết. | Các hệ thống Enterprise khổng lồ, cần cluster phân tán siêu lớn theo chuẩn Big Data. |

### 2.3. Khả năng ứng dụng thực tế
- **Qdrant:** Hệ thống gợi ý sản phẩm thương mại điện tử dựa trên text description, hoặc nền tảng RAG (Retrieval-Augmented Generation) cá nhân hoá nhẹ, deploy dạng Docker tốn ít tài nguyên.
- **Weaviate:** Công cụ tìm kiếm Đa phương tiện (Tìm đồ vật bằng cả câu mô tả văn bản hoặc bằng ảnh trực quan) nhờ khả năng tự nội suy data đa phương tiện.
- **Milvus:** Hệ thống gợi ý bài viết của MXH (như TikTok/Facebook) hoặc hệ thống phân tích hình ảnh nhận diện khuôn mặt ở camera giám sát cấp thành phố (Billion-scale records).

---

## Phần 3: Đề Xuất Dự Án Thực Tế (Project Benchmark)

**Cách ăn điểm tuyệt đối ở Seminar đại học là thực hiện một bài toán SO SÁNH (Benchmarking) khách quan, tự code chứ đừng chỉ đọc docs.**

### Tên dự án: Hệ thống RAG (Q&A Tài liệu môn Big Data) và Benchmark bộ 3 Qdrant - Weaviate - Milvus.
**Mô tả:** Hệ thống cho phép người dùng upload tài liệu (PDF, TXT) kiến thức Big Data. Giao diện (Streamlit UI) cho người dùng chat với tài liệu. Hệ thống sẽ có nút chọn xem người dùng muốn thực hiện query qua DB nào (Qdrant, Weaviate hay Milvus). Từ đó so sánh tốc độ cũng như code complexity của cả 3.

**Tech stack (Updated):**
- Khung sườn RAG: `LangChain` (embedding, chunking, retrieval).
- Embedding & LLM: Ollama local (`nomic-embed-text` + `qwen2.5:3b`) — miễn phí, không cần API key.
- Hạ tầng: `Docker Compose` chạy toàn bộ: 3 DB + Ollama + FastAPI backend + React frontend.
- **Frontend: React 18 + Three.js** — Dashboard tương tác, 3D Vector Space visualization, Recharts cho biểu đồ benchmark.
- **Backend: FastAPI (MVC)** — REST API `/api/v1/*`, Pydantic schemas, chia rõ controllers/services/routers.
- ~~Streamlit~~ → **Đã thay thế bởi React + FastAPI** để tăng tính chuyên nghiệp và khả năng 3D visualization.

**Các chỉ số (Metrics) dùng để So sánh trực tiếp trên đồ thị trong Slide:**
1. **Ingestion Time (Thời gian nạp Dữ liệu):** Push 1 cọc file PDF ~500 trang vào cả 3, xem DB nào load nhanh nhất?
2. **Query Latency (Độ trễ khi tìm kiếm):** Khi user chat 1 câu tìm kiếm, hệ thống đo xem Qdrant, Weaviate, Milvus thằng nào trả về kêt quả vector similarity nhanh hơn theo (ms).
3. **Mức tiêu thụ tài nguyên (Resource Consumption):** Dùng lệnh `docker stats` chỉ chụp thẳng xem RAM tiêu thụ khi idle và khi hoạt động của Qdrant (Rust) khác biệt thế nào với Milvus (Go/C++).
4. **Dev Experience (Tính trải nghiệm Code):** Đưa ra snapshot 1 đoạn code kết nối vào DB (nhận xét SDK của bên nào dễ thở, dễ hiểu hơn đối với Python dev).

*=> Việc đem dự án này lên Slide thuyết trình sẽ giải quyết toàn bộ yêu cầu về "hãy tiếp cận vấn đề dễ hiểu" (do hệ thống Chatbot/RAG thì ai cũng dễ tưởng tượng) đồng thời tạo ra "tính chứng minh cao" bằng data hiệu năng thực tế.*

---

## Phần 4: Kế Hoạch Triển Khai Chi Tiết (Timeline đề xuất)

### Tuần 1: Nghiên cứu, Phân chia & Dựng môi trường
- [ ] Phân công: 1 bạn làm chủ Milvus, 1 bạn Weaviate, 1 bạn Qdrant. Các bạn sẽ chịu trách nhiệm phần DB đó. Trưởng nhóm code Streamlit UI ghép nối.
- [ ] Mở máy ảo/Docker Compose chạy lên cài đặt Local Standalone cho cả 3.
- [ ] Chạy file python test kết nối insert dummy data thành công vào 3 db.

### Tuần 2: Viết Code Xây dựng Ứng dụng Benchmark (Demo)
- [ ] Xây dựng Pipeline Chunking file PDF & Embeddings dùng Langchain.
- [ ] Viết hàm (Class/Interface) chuẩn hoá 3 hành động: `Connect`, `Insert`, `Search/Retrieve` cho 3 DB riêng biệt nằm chung 1 project.
- [ ] Thực thi lưu vết lại thời gian, ghi log hiệu năng (nhập vào CSV để tạo biểu đồ báo cáo).
- [ ] Thiết kế UI trên Streamlit đẹp mắt, show thời gian query.

### Tuần 3: Chuẩn bị Thuyết trình & Báo Cáo
- **Thiết kế Slide (Chia sườn 30 phút - cực quan trọng):**
  + **5 phút mở đầu:** Cuốn hút, ví dụ tại sao RDBMS không dùng được vào việc tìm hình ảnh. Tóm tắt Vector Search.
  + **10 phút nội dung lõi:** Lướt qua đặc trưng 3 ông tướng. (Dùng hình ảnh, ít chữ!).
  + **10 phút Demo & Showcase Benchmark:** Mở video dự án đã quay sẵn (Tránh show live bị sập lỗi), giải thích kết quả so sánh Ingestion, Latency, RAM.
  + **5 phút kết luận:** Recommend dùng tool nào, lúc nào.
- **Viết Báo cáo Word:** Tập hợp kiến thức nghiên cứu được vào khung 10-15 trang; Bắt buộc phải trình bày **Sơ đồ Kiến trúc hệ thống (Architecture Diagram)** của 3 DB để so sánh chuyên sâu. Đưa các biểu đồ đã đo ra từ app code vào giải thích chuyên sâu. Report này sẽ là 1 Technical Paper thực thụ.
- **Lưu ý Thuyết trình/Demo:** Nêu bật các thông số License/Pricing. Đi TRỰC TIẾP vào demo chức năng chính (RAG Chatbot, Benchmarking). TUYỆT ĐỐI KHÔNG đưa phần cấu hình/cài đặt (System setup/Docker) lên Slide hoặc Video demo để tiết kiệm thời gian, phần đó chỉ để trong Phụ lục báo cáo.
- Nộp Slide trước 3 ngày.

### Tuần 4: Thử nghiệm thực tế & Chuẩn bị Q&A
- [ ] Các thành viên bấm giờ tập thuyết trình, phải khớp dưới 30p, nói gãy gọn.
- [ ] Lập List 10 Câu hỏi giả định thầy cô/các bạn sẽ vặn vẹo. Gợi ý:
    - *Vì sao không dùng pgvector (PostgreSQL extension) cho tiện mà phải dùng riêng rẽ VectorDB chuyên dụng?*
    - *Làm sao xử lý việc Update vector nếu data cũ bị thay đổi?*
    - *Weaviate có multi-modal, có thể ví dụ rõ hơn không?*
- [ ] Gom Source code viết `README.md` rõ ràng (hướng dẫn giáo viên cài lại được nhanh) -> đóng gói nén zip cùng Report/Slide nộp đúng hạn.
