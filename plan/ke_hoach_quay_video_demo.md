# Kịch bản & Hướng dẫn Quay Video Demo Chi tiết (Director's Cut - Expanded Edition)
**Đề tài:** A triple of Vectorstore: Qdrant, Weaviate, and Milvus  
**Mục đích:** Hướng dẫn quay màn hình trước (không thu âm live), lồng tiếng khớp miệng/lời thoại sau. Bản nâng cấp này bổ sung chi tiết về thiết lập (setup), cấu hình (config) vật lý của từng database, các tính năng nổi bật đối chiếu so sánh trực tiếp, và phân tích sâu hơn về benchmark chung để bài thuyết trình đạt tính thuyết phục khoa học cao nhất trước Hội đồng.

---

## 🎬 NGUYÊN TẮC QUAY VIDEO DEMO ĐẠT CHẤT LƯỢNG CAO
1. **Độ phân giải màn hình:** Quay ở chuẩn Full HD 1080p (`1920x1080`). Không quay màn hình 2K/4K vì chữ sẽ bị quá nhỏ khi trình chiếu.
2. **Tỉ lệ thu phóng trình duyệt (Zoom):** Tăng zoom của Google Chrome/Brave lên **120%** hoặc **125%** để các bảng số liệu và chữ hiện lên cực kỳ to và sắc nét.
3. **Ẩn thanh dấu trang (Bookmark Bar):** Nhấn `Ctrl + Shift + B` (trên Windows/Linux) hoặc `Cmd + Shift + B` (trên Mac) để ẩn thanh bookmark giúp giao diện rộng rãi và chuyên nghiệp hơn.
4. **Tốc độ di chuyển chuột (Mouse movement):** Di chuyển chuột chậm rãi, mượt mà. Không vẩy chuột quá nhanh. Khi nói đến vùng dữ liệu nào, hãy **di chuyển chuột quanh vùng đó hoặc hover để kích hoạt tooltip**, tránh chỉ chuột lung tung.

---

## 🛠️ CHI TIẾT THIẾT LẬP (SETUP) & CẤU HÌNH (CONFIG) VẬT LÝ TRONG WEB
Hệ thống Benchmark RAG full-stack được triển khai hoàn toàn bằng Docker Compose, chạy trên mạng cầu chung (`seminar_net`). Dưới đây là thông số thiết lập chi tiết của từng database:

### 1. Bảng cấu hình hạ tầng Docker Compose

| Thông số | Qdrant | Weaviate | Milvus Standalone |
| :--- | :--- | :--- | :--- |
| **Docker Image** | `qdrant/qdrant:latest` | `semitechnologies/weaviate:1.27.2` | `milvusdb/milvus:latest` |
| **Tài nguyên (RAM Limit)** | `1 GB` | `1 GB` | `2 GB` (do kiến trúc nhiều service phụ) |
| **Ports mở rộng (Host)** | `6333` (HTTP), `6334` (gRPC) | `8080` (HTTP), `50051` (gRPC) | `19530` (gRPC), `9091` (HTTP API) |
| **Tầng lưu trữ (Volume)** | `./volumes/qdrant_data` | `./volumes/weaviate_data` | `./volumes/milvus_data` |
| **Dependencies đi kèm** | Không (Single Binary) | Không (Single Binary) | `etcd` (v3.5.5 - lưu metadata)<br>`MinIO` (RELEASE.2023-03-20 - Object Storage) |
| **Biến môi trường lõi** | Mặc định | `QUERY_DEFAULTS_LIMIT: 25`<br>`DEFAULT_VECTORIZER_MODULE: 'none'` | `ETCD_ENDPOINTS: etcd:2379`<br>`MINIO_ADDRESS: minio:9000` |

### 2. Giao thức Công bằng (Fairness Protocol) & Cấu hình Chỉ mục HNSW
Để kết quả so sánh đạt tính khách quan khoa học, cả 3 cơ sở dữ liệu vector đều được ép cấu hình chỉ mục (Index Params) giống hệt nhau ở tầng Backend Python (`src/config.py`):
*   **Mô hình Embedding:** `nomic-embed-text` (Ollama) sinh vector dense có số chiều **`VECTOR_DIM = 768`**.
*   **Metric khoảng cách (Distance Metric):** `COSINE` (đo độ tương đồng góc cosine giữa các vector).
*   **Loại chỉ mục (Index Type):** `HNSW` (Hierarchical Navigable Small World).
*   **Tham số HNSW dựng đồ thị:**
    *   `M = 16` (Số liên kết tối đa của mỗi node vector trên đồ thị).
    *   `ef_construction = 128` (Độ sâu tìm kiếm trong quá trình build index đồ thị).
*   **Tham số HNSW tìm kiếm (Query):**
    *   `ef_search = 64` (Độ sâu tìm kiếm trong quá trình query đồ thị).

### 3. Cách thức Setup Collection / Schema trong Python (`src/core/db_clients/`)

*   **Qdrant (`qdrant.py`):**
    *   Khởi tạo qua `QdrantClient(prefer_grpc=True)`.
    *   Tự động kiểm tra collection `SeminarKnowledge_Base`. Nếu chưa có, tạo mới bằng `client.create_collection` cấu hình `vectors_config` với `distance=models.Distance.COSINE` và truyền trực tiếp cấu hình HNSW `models.HnswConfigDiff(m=16, ef_construct=128)`.
*   **Weaviate (`weaviate.py`):**
    *   Khởi tạo qua kết nối local `weaviate.connect_to_local()`.
    *   Định nghĩa Schema chặt chẽ gồm 5 thuộc tính: `content` (TEXT - chứa chunk văn bản), `source` (TEXT), `chunk_id` (TEXT), `category` (TEXT), và `page` (INT - số trang).
    *   Vô hiệu hóa bộ vectorizer tự động bằng `Configure.Vectorizer.none()` (do backend tự dùng Ollama nhúng).
    *   Ép cấu hình HNSW thông qua `Configure.VectorIndex.hnsw(distance_metric=VectorDistances.COSINE, max_connections=16, ef_construction=128, ef=64)`.
*   **Milvus (`milvus.py`):**
    *   Kết nối qua `connections.connect()`.
    *   Tạo Schema dạng bảng quan hệ chặt chẽ: `id` (INT64 primary key, auto_id), `content` (VARCHAR tối đa 65,535 ký tự), `vector` (FLOAT_VECTOR chiều 768), cùng các trường metadata `source` (VARCHAR), `category` (VARCHAR), và `page` (INT64).
    *   Gọi lệnh tạo index tường minh: `collection.create_index("vector", {"metric_type": "COSINE", "index_type": "HNSW", "params": {"M": 16, "efConstruction": 128}})`.
    *   **Đặc thù Milvus:** Phải thực hiện lệnh `collection.load()` để nạp bộ chỉ mục từ ổ đĩa lên RAM thì mới sẵn sàng tìm kiếm. Đoạn mã có tích hợp đo RAM spike và độ trễ load.

---

## ⚖️ MA TRẬN ĐỐI CHIẾU CÁC TÍNH NĂNG NỔI BẬT NHẤT (OUTSTANDING FEATURES)
Trước khi đi vào kịch bản, bảng dưới đây đúc kết các tính năng cốt lõi tạo nên sự khác biệt lớn nhất giữa ba công cụ, giúp người thuyết trình nắm chắc lập luận:

| Đặc tính | Qdrant | Weaviate | Milvus |
| :--- | :--- | :--- | :--- |
| **Ngôn ngữ phát triển** | **Rust** (An toàn bộ nhớ tuyệt đối, không có Garbage Collector, footprint cực nhỏ). | **Go** (Dễ viết và tối ưu, quản lý memory tốt, tính module hóa cao). | **Go & C++** (Lõi tính toán bằng C++ để tối ưu SIMD cực hạn, quản lý bằng Go). |
| **Tính năng nổi bật nhất** | **Payload Metadata Filtering dynamic cực mạnh** tại storage engine level. | **Hybrid Search nguyên bản (Out-of-the-box)** kết hợp Dense HNSW + Sparse BM25. | **Kiến trúc Cloud-Native phân tán (Shared-Storage)** scale độc lập read/write. |
| **Độ phức tạp vận hành** | **Rất thấp** (Chạy single binary hoặc cluster đơn giản, DX rất mượt). | **Trung bình** (Hỗ trợ GraphQL/REST/gRPC, cấu hình trực quan). | **Cao** (Cần `etcd` và `MinIO`/S3, nhiều microservices dịch vụ phối hợp). |
| **Workload phù hợp nhất** | RAG nội bộ doanh nghiệp có **phân quyền phức tạp (ACL, Multi-tenant)**, nhiều bộ lọc thời gian/phòng ban. | RAG trên dữ liệu **dạng văn bản chứa nhiều thuật ngữ hẹp (mã lỗi, tên riêng, log, mã SP)** cần BM25 exact-match. | Hệ thống RAG **quy mô lớn (hàng triệu/tỷ vector)** cần tính sẵn sàng cao (HA), tải ghi và đọc tách biệt hoàn toàn. |

---

## ⏱️ BẢNG TIMELINE QUAY VIDEO CHI TIẾT (FULL SCRIPT & ACTION)

*Phần này cung cấp toàn bộ hướng dẫn thao tác kết hợp với lời thoại nguyên văn từng chữ mà các thành viên sẽ đọc (lồng tiếng). Lời thoại đã được thiết kế lại để làm nổi bật các tính năng so sánh và làm rõ thiết lập hạ tầng của từng DB.*

### 📹 Phân đoạn 1: Dashboard Tổng quan & Thiết lập Vật lý của Hệ thống
* **Thời gian trong video:** `00:00 - 01:30` (Tổng cộng 90 giây)
* **Trang hiển thị:** `/` (`http://localhost:5173/` - khớp ảnh `dashboard.png`)
* **Speaker:** Bạn (Người thuyết trình duy nhất)

**Kịch bản & Lời thoại chi tiết:**

*   **(00:00 - 00:05)**
    *   **Thao tác (Action):** Mở trang Dashboard. Chuột di chuyển chậm rãi từ Logo hệ thống ở góc trên bên trái, kéo sang góc trên bên phải, **chỉ vào 3 DB online** (Qdrant: Online, Weaviate: Online, Milvus: Online) và dừng lại ở đó.

    *   **Bạn (Script):** "Kính thưa thầy và hội đồng bảo vệ, để chứng minh các kết quả nghiên cứu lý thuyết về lưu trữ đa chiều trong bài báo cáo, em xin phép trình bày hệ thống RAG Benchmarking thực nghiệm của nhóm 4T."

*   **(00:05 - 00:25)**
    *   **Thao tác (Action):** Di chuột tròn nhẹ quanh 3 DB status màu xanh lá. Từ từ di chuyển chuột xuống góc dưới bên phải, hover vào phần mô tả hạ tầng.

    *   **Bạn (Script):** "Đây là một hệ thống full-stack được chúng em phát triển từ đầu, tích hợp và chạy song song 3 Vector Database hàng đầu hiện nay là Qdrant, Weaviate, và Milvus Standalone. Toàn bộ hệ thống được triển khai bằng Docker Compose trên cùng một mạng cầu nội bộ. Tại đây, thầy có thể thấy cả 3 cơ sở dữ liệu đều đang ở trạng thái Online và sẵn sàng phục vụ các truy vấn kiểm thử."

*   **(00:25 - 00:45)**
    *   **Thao tác (Action):** Đưa chuột vào chính giữa quả cầu vector 3D màu xanh neon. Nhấn giữ chuột trái và **kéo xoay mượt mà sang trái 90 độ, kéo lên trên 45 độ** (zoom-in nhẹ rồi zoom-out).

    *   **Bạn (Script):** "Để trực quan hóa không gian đa chiều, hệ thống tích hợp một module render 3D thời gian thực sử dụng Three.js. Bằng cách giảm chiều dữ liệu từ không gian 768 chiều của mô hình Embedding xuống còn 3 chiều trực quan, các đoạn văn bản nhúng được hiển thị dưới dạng các tọa độ điểm. Thầy có thể thấy rõ các câu có ý nghĩa tương đồng ngữ nghĩa sẽ tự động co cụm lại với nhau rất rõ ràng."

*   **(00:45 - 01:10)**
    *   **Thao tác (Action):** Di chuột xuống phần **"Current setup"** ở góc phải màn hình. Chỉ vào thông tin mô hình LLM (`qwen2.5:1.5b`) và model embedding (`nomic-embed-text`). Hover nhẹ vào thông số số chiều vector (`768`).

    *   **Bạn (Script):** "Về mặt cấu hình lõi, hệ thống sử dụng mô hình LLM mã nguồn mở Qwen 2.5 1.5B chạy local qua Ollama cho khâu Generation, kết hợp mô hình Nomic-Embed-Text tạo vector embedding dense 768 chiều. Quan trọng nhất, để đảm bảo tính công bằng khoa học cho quá trình benchmark, chúng em thiết lập một **Giao thức Công bằng (Fairness Protocol)**: cả 3 database đều dùng chung một thông số cấu hình chỉ mục HNSW là M=16, ef_construction=128 và ef_search=64, với khoảng cách Cosine."

*   **(01:10 - 01:30)**
    *   **Thao tác (Action):** Cuộn chuột xuống dưới cùng trang. Lần lượt di chuột qua 3 thẻ đặc tính kỹ thuật ở dưới: Qdrant (dừng 3s) ➡️ Weaviate (dừng 3s) ➡️ Milvus (dừng 3s), sau đó click vào nút **Architecture** ở menu bên trái.

    *   **Bạn (Script):** "Mục tiêu của nghiên cứu thực nghiệm này không phải là tìm một công cụ chiến thắng tuyệt đối, mà là làm rõ các đánh đổi kỹ thuật. Qdrant viết bằng Rust siêu gọn nhẹ với thế mạnh lọc payload metadata; Weaviate viết bằng Go tối ưu cho tìm kiếm kết hợp hybrid; và Milvus viết bằng Go/C++ sinh ra cho các kho dữ liệu quy mô phân tán cực lớn. Đầu tiên, em xin đi sâu vào Qdrant."

---

### 📹 Phân đoạn 2: Qdrant & Sức mạnh Payload Metadata Filtering từ Rust
* **Thời gian trong video:** `01:30 - 03:00` (Tổng cộng 90 giây)
* **Trang hiển thị:** `/architecture` ➡️ `/rag-chat` (khớp ảnh `architecture.png`, `rag-chat.png`)
* **Speaker:** Bạn (Người thuyết trình duy nhất)

**Kịch bản & Lời thoại chi tiết:**

*   **(01:30 - 01:45)**
    *   **Thao tác (Action):** Tại trang Architecture, di chuột dọc theo cột kiến trúc hình khối **Qdrant (Payload-First)** ở bên trái màn hình.

    *   **Bạn (Script):** "Về Qdrant, đây là cơ sở dữ liệu vector được viết hoàn toàn bằng ngôn ngữ Rust, mang lại sự an toàn bộ nhớ tuyệt đối mà không cần cơ chế dọn rác Garbage Collector. Trong file setup Docker, Qdrant chạy cực kỳ mượt mà chỉ với giới hạn tài nguyên tối thiểu 1 Gigabyte RAM. Điểm nổi bật nhất của Qdrant so với hai đối thủ còn lại chính là cơ chế lọc payload metadata động cực kỳ mạnh mẽ."

*   **(01:45 - 02:10)**
    *   **Thao tác (Action):** Click chọn nút **RAG Chat** trên menu trái. Click chọn tab **Single Mode** và click chọn biểu tượng database **Qdrant**. Di chuột lướt nhẹ qua khu vực Upload Panel để hiển thị trạng thái sẵn sàng nạp PDF.

    *   **Bạn (Script):** "Trong các hệ thống RAG thực tế của doanh nghiệp, nhu cầu lọc tài liệu theo người dùng, phòng ban (ACL) hoặc mốc thời gian là bắt buộc. Qdrant cho phép đính kèm metadata (payload) trực tiếp vào point vector và thực hiện lọc ngay trong một bước quét đồ thị. Khác với Weaviate cần khai báo trước schema metadata phức tạp hay Milvus cần chuyển đổi biểu thức SQL-like qua điều phối viên, Qdrant áp dụng bộ lọc trực tiếp ở tầng lưu trữ lõi bằng Rust, giúp tối ưu hóa bộ nhớ và giảm thiểu tối đa độ trễ."

*   **(02:10 - 02:40)**
    *   **Thao tác (Action):** Click vào thanh nhập liệu (Input Chat), thực hiện gõ câu hỏi: *"Cơ chế bảo mật multi-tenant hoạt động như thế nào?"*. Nhấn **Enter** hoặc bấm nút **Gửi**.

    *   **Bạn (Script):** "Em thực hiện đặt một câu hỏi giả lập về multi-tenant: *'Cơ chế bảo mật multi-tenant hoạt động như thế nào?'*. Ở phía backend, client Qdrant được kết nối qua giao thức gRPC tốc độ cao ở cổng 6334. Hệ thống đã nhanh chóng tạo vector truy vấn, Qdrant tìm kiếm các chunk văn bản tương ứng và đưa cho LLM Qwen để tổng hợp câu trả lời."

*   **(02:40 - 03:00)**
    *   **Thao tác (Action):** Khi câu trả lời xuất hiện, di chuột chỉ vào vùng **thẻ thông số (Qdrant, latency...)** ở dưới cùng góc trái của khung chat.

    *   **Bạn (Script):** "*(Chỉ vào thẻ thông số)* Thầy có thể thấy độ trễ pha Retrieval của Qdrant chỉ mất vỏn vẹn vài mili-giây. Nhờ thế mạnh của Rust và thiết kế payload-first, Qdrant là lựa chọn hoàn hảo nhất cho các ứng dụng RAG nội bộ doanh nghiệp yêu cầu phân quyền bảo mật chặt chẽ, cập nhật dữ liệu liên tục mà vẫn muốn giữ footprint hạ tầng ở mức tối giản nhất."

---

### 📹 Phân đoạn 3: Weaviate & Giải thuật Tìm kiếm Kết hợp Hybrid Search
* **Thời gian trong video:** `03:00 - 04:30` (Tổng cộng 90 giây)
* **Trang hiển thị:** `/hybrid` (khớp ảnh `hybrid-search.png`)
* **Speaker:** Bạn (Người thuyết trình duy nhất)

**Kịch bản & Lời thoại chi tiết:**

*   **(03:00 - 03:20)**
    *   **Thao tác (Action):** Click chuột trái vào nút **Hybrid Search** trên menu điều hướng trái. Di chuột quanh dòng tiêu đề trang *"Hybrid search latency ranking"*.

    *   **Bạn (Script):** "Tiếp theo, em xin phép chuyển sang Weaviate - đại diện viết bằng ngôn ngữ Go. Weaviate được cấu hình chạy độc lập ở cổng HTTP 8080 và gRPC 50051. Vũ khí mạnh nhất của Weaviate so với Qdrant và Milvus chính là khả năng Tìm kiếm kết hợp (Hybrid Search) tích hợp sẵn cực kỳ mạnh mẽ mà không cần cấu hình bên ngoài phức tạp."

*   **(03:20 - 03:45)**
    *   **Thao tác (Action):** Click vào ô tìm kiếm ở giữa trang. Nhập câu truy vấn: *"lỗi phân quyền Tenant A trong module thanh toán"*. Bấm nút **Run retrieval**.

    *   **Bạn (Script):** "Em đặt một câu truy vấn mang tính thử thách cao: *'lỗi phân quyền Tenant A trong module thanh toán'*. Câu hỏi này chứa các thuật ngữ đặc thù như 'Tenant A' hay 'module thanh toán'. Với tìm kiếm vector dense thông thường, hệ thống có thể hiểu sai ý chung hoặc làm mờ đi các từ khóa quan trọng này. Đây chính là nơi Weaviate thể hiện sức mạnh vượt trội."

*   **(03:45 - 04:10)**
    *   **Thao tác (Action):** Khi biểu đồ Recharts hiện lên, đưa chuột vào cột màu **Xanh Dương (Weaviate)** và **để yên chuột khoảng 3 giây** để hiển thị Tooltip báo độ trễ.

    *   **Bạn (Script):** "Trên biểu đồ thời gian thực, Weaviate (cột màu xanh dương) tốn khoảng 14.5 ms để hoàn thành, chậm hơn khoảng 3 lần so với Qdrant. Tuy nhiên, đây là một sự đánh đổi hoàn toàn xứng đáng. Bản chất thuật toán của Weaviate ở đây là chạy song song hai luồng: tìm kiếm vector dense trên đồ thị HNSW và tìm kiếm từ khóa thưa (sparse) bằng chỉ mục đảo ngược theo thuật toán BM25. Sau đó, Weaviate sử dụng giải thuật Reciprocal Rank Fusion (RRF) với tham số alpha = 0.5 để dung hợp và xếp hạng lại kết quả."

*   **(04:10 - 04:30)**
    *   **Thao tác (Action):** Di chuột sang cột màu **Đỏ (Qdrant)** và cột **Xanh Lá (Milvus)** để đối chiếu độ trễ thấp hơn của chúng, sau đó chỉ vào danh sách kết quả bên phải.

    *   **Bạn (Script):** "Trong khi Qdrant và Milvus chỉ chạy tìm kiếm vector thuần nên có độ trễ cực thấp dưới 5ms, thì Weaviate chấp nhận đánh đổi một chút hiệu năng để đảm bảo chất lượng tìm kiếm đạt mức tối đa đối với các dữ liệu dạng log kỹ thuật, mã lỗi hoặc catalog sản phẩm - nơi mà từ khóa chính xác quan trọng ngang ngửa ngữ nghĩa chung."

---

### 📹 Phân đoạn 4: Milvus & Kiến trúc Phân tán Doanh nghiệp (Cloud-Native)
* **Thời gian trong video:** `04:30 - 06:00` (Tổng cộng 90 giây)
* **Trang hiển thị:** `/architecture` ➡️ `/latency` (khớp ảnh `architecture.png`, `latency.png`)
* **Speaker:** Bạn (Người thuyết trình duy nhất)

**Kịch bản & Lời thoại chi tiết:**

*   **(04:30 - 04:50)**
    *   **Thao tác (Action):** Click chọn nút **Architecture** ở menu trái. Rê chuột từ trên xuống dọc theo cột kiến trúc phức tạp của **Milvus** (Proxy -> Coordinator -> QueryNode -> MinIO Storage).

    *   **Bạn (Script):** "Cuối cùng trong bộ ba, em xin giới thiệu Milvus. Nếu Qdrant và Weaviate hướng đến sự tinh gọn, dễ tích hợp thì Milvus lại là một gã khổng lồ được thiết kế theo tư duy Cloud-Native phân tán. Để thiết lập bản Milvus Standalone chạy local, Docker Compose phải khai báo thêm hai service phụ bắt buộc là `etcd` để điều phối metadata và `MinIO` làm tầng lưu trữ đối tượng dạng phân đoạn (segments)."

*   **(04:50 - 05:25)**
    *   **Thao tác (Action):** Click chọn nút **Latency** trên menu điều hướng trái. Di chuột lên bộ lọc DB ở góc trên bên phải, bấm chọn **Milvus**, sau đó bấm chọn lại **All**.

    *   **Bạn (Script):** "Thiết lập của Milvus đòi hỏi cấu hình tài nguyên tối thiểu 2 Gigabyte RAM. Kiến trúc lõi của Milvus phân tách hoàn toàn tầng tính toán và tầng lưu trữ (Shared-Storage). Luồng ghi dữ liệu đi qua Proxy, Coordinator vào các phân đoạn dữ liệu được lưu trên MinIO, trong khi các QueryNode chịu trách nhiệm đọc dữ liệu. Sự phân tách này cho phép Milvus mở rộng quy mô (scale-out) không giới hạn: ta có thể thêm hàng chục node đọc mà không ảnh hưởng đến hiệu năng ghi, đáp ứng quy mô hàng tỷ vector trong môi trường enterprise lớn."

*   **(05:25 - 06:00)**
    *   **Thao tác (Action):** Di chuột vòng quanh vòng tròn đo tốc độ **p50 median** (`4.1 ms`) và **p95 tail** (`6.2 ms`). Cuộn chuột xuống dưới cùng, chỉ vào biểu đồ **Search Latency** và **Insert Latency**.

    *   **Bạn (Script):** "Dù cấu hình Docker phức tạp và dữ liệu phải đi qua nhiều thành phần RPC, Milvus vẫn đạt độ trễ trung vị p50 cực kỳ ấn tượng là 4.1 ms trong snapshot kiểm thử này. Kết quả này có được nhờ lõi tính toán Knowhere viết bằng C++ tối ưu hóa phần cứng và cơ chế load collection trực tiếp vào RAM. Điểm đánh đổi duy nhất của Milvus chính là độ phức tạp trong vận hành và tài nguyên duy trì lớn hơn nhiều so với Qdrant và Weaviate."

---

### 📹 Phân đoạn 5: Đo lường Hiệu năng Thực nghiệm trên Tập Benchmark Chung
* **Thời gian trong video:** `06:00 - 07:30` (Tổng cộng 90 giây)
* **Trang hiển thị:** `/accuracy` ➡️ `/tradeoff` (khớp ảnh `accuracy.png`, `tradeoff.png`)
* **Speaker:** Bạn (Người thuyết trình duy nhất)

**Kịch bản & Lời thoại chi tiết:**

*   **(06:00 - 06:30)**
    *   **Thao tác (Action):** Click chọn trang **Accuracy**. Chỉ chuột vào cột Milvus trên biểu đồ **Recall@K Leaderboard**. Cuộn xuống bảng số liệu, rê chuột dọc theo hàng **Milvus** (Recall@10: **44.0%**, MRR: **24.9%**).

    *   **Bạn (Script):** "Bây giờ, em xin trình bày phần quan trọng nhất: kết quả đánh giá trên cùng một tập benchmark chung để đối chiếu trực tiếp hiệu năng khoa học. Tập dữ liệu thử nghiệm bao gồm **10,000 chunk văn bản tổng hợp** và bộ **200 truy vấn mẫu** có gán nhãn ground-truth. Trên biểu đồ độ chính xác Recall@10, Milvus đang tạm dẫn đầu với tỉ lệ tìm hồi đạt 44.0%, đồng thời chỉ số MRR đạt 24.9%, nghĩa là tài liệu chính xác nhất có xu hướng xuất hiện ở vị trí hàng đầu."

*   **(06:30 - 07:10)**
    *   **Thao tác (Action):** Click chuột vào nút **Tradeoff** trên menu trái. Đưa chuột vào biểu đồ **Interactive Pareto Frontier**. Di chuột dọc theo đường cong màu xanh lá của Milvus từ `top_k=1` dần sang phải lên đến `top_k=50`.

    *   **Bạn (Script):** "Tuy nhiên, trong kỹ thuật hệ thống, chúng ta luôn phải đối mặt với bài toán đánh đổi Trade-off giữa thời gian phản hồi (Latency) và độ chính xác (Recall). Tại biểu đồ Pareto Frontier này, trục hoành thể hiện Latency (càng nhỏ càng tốt), trục tung là Recall (càng cao càng tốt). Đường cong Pareto của Milvus trong snapshot này chứng minh hiệu quả tối ưu hóa vượt trội của lõi C++: khi chúng ta tăng `top_k` từ 1 lên 50 để tăng Recall, độ trễ truy vấn của Milvus chỉ nhích nhẹ từ 4.1 ms lên 4.17 ms, giữ vững đường biên hiệu quả."

*   **(07:10 - 07:30)**
    *   **Thao tác (Action):** Di chuột xuống phần kết luận khoa học **"Seminar conclusion"** ở góc dưới cùng, rê chuột chậm rãi theo dòng chữ.

    *   **Bạn (Script):** "Kết quả benchmark này được thực hiện trong điều kiện cực kỳ nghiêm ngặt của Giao thức Công bằng (Fairness Protocol) khi cả 3 database đều sử dụng chung một cấu hình chỉ mục HNSW. Sự chênh lệch nhỏ về độ chính xác và độ trễ chứng minh rằng các bộ thư viện tính toán của từng DB đã được tối ưu hóa rất tốt cho phần cứng hiện đại."

---

### 📹 Phân đoạn 6: Live RAG Chat So sánh & Điểm DX Score
* **Thời gian trong video:** `07:30 - 09:00` (Tổng cộng 90 giây)
* **Trang hiển thị:** `/rag-chat` ➡️ `/dx-score` (khớp ảnh `rag-chat.png`, `dx-score.png`)
* **Speaker:** Bạn (Người thuyết trình duy nhất)

**Kịch bản & Lời thoại chi tiết:**

*   **(07:30 - 08:15)**
    *   **Thao tác (Action):** Click chọn lại trang **RAG Chat** ở menu trái. Tại sidebar trái, click chọn chế độ **Compare Mode**. Nhập câu hỏi: *"Vector database nào tốt nhất cho RAG?"* rồi bấm **Gửi**.

    *   **Bạn (Script):** "Để kiểm chứng chất lượng RAG một cách trực quan, em kích hoạt chế độ **Compare Mode** của hệ thống. Truy vấn *'Vector database nào tốt nhất cho RAG?'* sẽ được backend gửi song song tới cả 3 database. Hệ thống sẽ bóc tách chi tiết hai pha: pha Retrieval (truy hồi ngữ cảnh từ vector DB) và pha Generation (LLM sinh câu trả lời dựa trên ngữ cảnh đó)."

*   **(08:15 - 08:45)**
    *   **Thao tác (Action):** Rê chuột từ trái sang phải qua 3 cột câu trả lời tương ứng Qdrant ➡️ Weaviate ➡️ Milvus. Chỉ chuột vào thanh đo thời gian màu xanh neon ở dưới mỗi câu trả lời.

    *   **Bạn (Script):** "Thầy có thể thấy, dù cùng một prompt và cùng một LLM Qwen, nội dung trả lời của ba cột có sự khác biệt rõ rệt. Điều này phản ánh sự khác nhau trong giải thuật định tuyến của từng database, tạo ra các ngữ cảnh đầu vào (context) khác nhau cho LLM. Pha đo lường thời gian thực này cũng thể hiện rõ độ trễ sinh từ của LLM là tương đương nhau, nhưng tốc độ tìm kiếm ngữ cảnh của Qdrant và Milvus đang nhanh hơn rõ rệt."

*   **(08:45 - 09:00)**
    *   **Thao tác (Action):** Click chọn nút **DX Score** trên menu trái. Chỉ chuột vào 3 thẻ điểm **Composite DX**, sau đó chỉ xuống bảng chi tiết chỉ số tĩnh.

    *   **Bạn (Script):** "Bên cạnh các thông số vật lý, nhóm cũng đánh giá chỉ số Trải nghiệm lập trình viên (DX Score). Bằng việc đo lường độ phức tạp cyclomatic và số dòng code cần thiết để khởi tạo kết nối và thực hiện truy vấn ở tầng backend Python, Milvus nhận điểm DX thấp hơn do đòi hỏi nhiều dòng lệnh khởi tạo, định cấu hình schema và tải partition. Ngược lại, Qdrant và Weaviate với SDK tinh gọn đạt điểm DX rất cao, cực kỳ thân thiện cho phát triển ứng dụng nhanh."

---

### 📹 Phân đoạn 7: Đúc kết Ma trận Quyết định & Kết thúc
* **Thời gian trong video:** `09:00 - 10:00` (Tổng cộng 60 giây)
* **Trang hiển thị:** `/architecture` ➡️ `/` (Dashboard)
* **Speaker:** Bạn (Người thuyết trình duy nhất)

**Kịch bản & Lời thoại chi tiết:**

*   **(09:00 - 09:40)**
    *   **Thao tác (Action):** Click chọn **Architecture** trên menu điều hướng trái. Cuộn xuống dưới cùng trang đến phần **"Decision Matrix"**. Di chuột rê dọc theo 3 cột quyết định.

    *   **Bạn (Script):** "Để đúc kết lại nghiên cứu thực nghiệm, dựa trên ma trận quyết định được xây dựng tự động từ kết quả benchmark: Nếu hệ thống RAG yêu cầu tính bảo mật cao, phân quyền truy cập động theo tenant, phòng ban và tài nguyên hạ tầng hạn chế: Qdrant viết bằng Rust là sự lựa chọn tối ưu nhất. Nếu tài liệu cần RAG chứa nhiều từ khóa đặc thù, thuật ngữ kỹ thuật hẹp và mã hiệu cần độ chính xác cao: Weaviate với công nghệ Hybrid Search BM25 nguyên bản là giải pháp vượt trội. Còn nếu thầy đang xây dựng một hệ thống RAG cấp tập đoàn với quy mô hàng triệu người dùng, hàng tỷ vector và yêu cầu tính sẵn sàng cao (HA): kiến trúc phân tán tách biệt đọc/ghi của Milvus chính là câu trả lời."

*   **(09:40 - 10:00)**
    *   **Thao tác (Action):** Chuyển nhanh về trang `/` (Dashboard) ở 10 giây cuối cùng. Thực hiện **xoay nhẹ quả cầu vector 3D** một lần nữa thật mượt mà. Kết thúc video (Stop Recording).

    *   **Bạn (Script):** "Bài thuyết trình và demo thực nghiệm so sánh bộ ba Vector Database của nhóm 4T đến đây xin được kết thúc. Em xin chân thành cảm ơn sự theo dõi của các thầy trong Hội đồng và rất mong nhận được những ý kiến đóng góp, câu hỏi phản biện từ các thầy ạ!"
