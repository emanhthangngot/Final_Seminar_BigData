# Phân công thuyết trình chi tiết - Seminar Vector Store cho RAG

**Đề tài:** A triple of Vectorstore: Qdrant, Weaviate, and Milvus  
**Môn:** Nhập môn Dữ liệu lớn  
**Nhóm:** Group 4T  
**Ngày cập nhật:** 2026-05-26  
**Căn cứ:** `main.tex`, các file trong `content/`, `README.md`, `docs/demo_final.md`, `source/slide_master_plan.md`, và snapshot benchmark trong `frontend/public/benchmark-data/combined/`.

## 1. Nguyên tắc trình bày chung

Bài thuyết trình nên đi theo mạch: **tại sao cần Vector Database -> ba công cụ -> kiến trúc riêng -> so sánh -> benchmark -> demo -> kết luận lựa chọn**.

Thông điệp cần lặp lại trong toàn bài:

- Vector Database không thay thế SQL/NoSQL; nó giải quyết bài toán tìm kiếm theo ngữ nghĩa cho RAG.
- Không có Vector Database tốt nhất cho mọi trường hợp. Lựa chọn đúng phụ thuộc vào workload, SLA, corpus size, metadata filter và năng lực vận hành.
- Qdrant mạnh khi cần filtered retrieval và triển khai gọn.
- Weaviate mạnh khi cần hybrid retrieval: keyword/BM25 + semantic vector.
- Milvus mạnh khi cần scale lớn, HA và kiến trúc distributed.
- Benchmark của nhóm là snapshot theo cùng corpus, cùng query, cùng HNSW config; không nên diễn giải thành kết quả tuyệt đối cho mọi workload.

## 2. Phân công tổng quát

| Thứ tự | Thành viên | Thời lượng gợi ý | Phần phụ trách | Mục tiêu |
|---:|---|---:|---|---|
| 1 | **Lê Xuân Trí - 23120099** | 9-10 phút | Mở đầu, RAG overview, hệ thống demo, benchmark results/dashboard | Đặt bối cảnh và chứng minh nhóm có hệ thống full-stack thật |
| 2 | **Trần Lê Trung Trực - 23120165** | 8-9 phút | Qdrant, comparison, quantization, demo Qdrant | Làm rõ Qdrant phù hợp filter-heavy RAG |
| 3 | **Nguyễn Hồ Anh Tuấn - 23120185** | 8-9 phút | Weaviate, hybrid search, RRF, methodology/tradeoff, demo Weaviate | Làm rõ Weaviate phù hợp RAG cần keyword + semantic |
| 4 | **Trần Hữu Kim Thành - 23120166** | 9-10 phút | Milvus, lifecycle, HA, demo Milvus, kết luận | Làm rõ Milvus phù hợp scale/distributed production |

Nếu cần rút ngắn còn 25-30 phút, mọi người cắt bớt ví dụ và demo live; giữ lại các slide có takeaway.

## 3. Thứ tự trình bày chi tiết theo slide

### Phần A - Lê Xuân Trí: Mở đầu và tổng quan RAG

#### Slide 1 - Title

**Nội dung cần nói:**

"Kính chào thầy và các bạn. Nhóm em trình bày đề tài 'A triple of Vectorstore: Qdrant, Weaviate, and Milvus', thuộc chủ đề Vector Store cho RAG workflows. Mục tiêu của nhóm không chỉ là giới thiệu từng công cụ, mà là trả lời câu hỏi thực tế: nếu xây dựng một hệ thống RAG, nên chọn vector database nào trong từng bối cảnh?"

**Điểm nhấn:** Giới thiệu đủ tên 4 thành viên, giảng viên hướng dẫn, và nhấn mạnh đây là bài so sánh có demo.

#### Slide 2 - Mục lục

**Nội dung cần nói:**

"Bài trình bày đi theo bảy phần. Đầu tiên là bối cảnh RAG và vai trò của Vector Database. Sau đó nhóm lần lượt phân tích Qdrant, Weaviate và Milvus. Cuối cùng là so sánh, benchmark thực nghiệm và kết luận chọn công cụ theo use case."

**Chuyển tiếp:** "Trước khi vào từng database, chúng ta cần thống nhất Vector Database giải quyết vấn đề gì trong RAG."

#### Slide 3 - Mục tiêu và mạch trình bày

**Nội dung cần nói:**

"Trong RAG, LLM không nên trả lời dựa trên trí nhớ mô hình một cách độc lập. Hệ thống cần lấy các đoạn tài liệu liên quan trước, đưa vào prompt, rồi LLM mới sinh câu trả lời. Vì vậy tầng retrieval quyết định rất nhiều đến chất lượng câu trả lời."

**Bổ sung:** Nói rõ 3 trục đánh giá của bài:

- Kiến trúc: công cụ được thiết kế để tối ưu cái gì?
- Hiệu năng: latency, Recall@K, MRR, tradeoff.
- Vận hành: dependency, schema, monitoring, Docker/local deployment.

#### Slide 4 - Vì sao cần Vector Database?

**Nội dung cần nói:**

"LLM có ba giới hạn lớn: không biết dữ liệu nội bộ, không cập nhật sau thời điểm train, và có thể hallucinate khi thiếu context. RAG giải quyết bằng cách thêm một bước retrieval. Tài liệu được chia chunk, embedding thành vector, lưu vào Vector Database. Khi user hỏi, câu hỏi cũng được embedding và database tìm Top-K chunk gần nghĩa nhất."

**Câu chốt:** "SQL/NoSQL tốt cho exact match, còn Vector Database tốt cho semantic similarity."

#### Slide 5 - Kiến trúc pipeline RAG

**Nội dung cần nói:**

"Pipeline có hai pha. Pha indexing: PDF -> chunk -> embedding -> Vector DB. Pha answering: question -> query vector -> Top-K context -> LLM answer. Nếu retrieval sai, LLM sẽ không có evidence đúng, nên câu trả lời vẫn có thể sai dù model mạnh."

**Bổ sung metric:** Giải thích nhanh:

- Latency: truy vấn nhanh hay chậm.
- Recall@K: trong K kết quả đầu có chứa chunk đúng không.
- MRR: chunk đúng xuất hiện càng sớm điểm càng cao.

#### Slide 6 - Hệ thống demo: từ benchmark đến dashboard

**Nội dung cần nói:**

"Nhóm không chỉ làm slide lý thuyết. Hệ thống demo gồm React + Vite + Three.js frontend, FastAPI backend, core Python benchmark logic, và ba database Qdrant, Weaviate, Milvus chạy qua Docker Compose. Ollama local được dùng cho embedding `nomic-embed-text` và LLM nhẹ `qwen2.5:1.5b`."

**Thông tin từ README:**

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- Health endpoint: `/api/v1/health`
- Endpoint demo: `/api/v1/ingest`, `/api/v1/chat`, `/api/v1/metrics`, `/api/v1/benchmark/accuracy/latest`, `/api/v1/benchmark/tradeoff/latest`

#### Slide 7 - Ba hệ quản trị Vector Database tiêu biểu

**Nội dung cần nói:**

"Ba công cụ cùng lưu vector và tìm nearest neighbors, nhưng triết lý khác nhau. Qdrant viết bằng Rust, tối ưu filtered retrieval. Weaviate viết bằng Go, nổi bật với Hybrid Search và schema-driven API. Milvus dùng Go + C++, thiết kế distributed-first cho corpus lớn và HA."

**Câu chốt:** "Cùng bài toán vector search, nhưng mỗi công cụ tối ưu cho một ràng buộc khác nhau."

#### Slide 8 - Độ phổ biến và cộng đồng GitHub

**Nội dung cần nói:**

"GitHub stars là tín hiệu cộng đồng, không phải benchmark. Milvus có cộng đồng lớn và lâu đời, Qdrant tăng nhanh trong làn sóng RAG/AI agents, Weaviate nhỏ hơn nhưng mạnh về developer experience và hybrid search."

**Lưu ý:** Nếu bị hỏi, nói rằng stars là dữ liệu tham khảo và có thể thay đổi theo thời gian.

#### Slide 9 - Mã nguồn mở và mô hình triển khai

**Nội dung cần nói:**

"Cả ba đều self-host được. Qdrant và Milvus dùng Apache 2.0, Weaviate dùng BSD-3. Khác biệt chi phí thực tế không nằm ở license, mà nằm ở hạ tầng, RAM, storage, backup, monitoring và mức độ phức tạp khi vận hành."

#### Slide 10 - Free tier cloud và giới hạn thử nghiệm

**Nội dung cần nói:**

"Cloud free tier phù hợp prototype, nhưng seminar của nhóm tập trung vào self-host benchmark để kiểm soát biến số. Khi lên production, chi phí thật nằm ở tài nguyên, SLA, backup, observability và khả năng scale."

**Chuyển giao sang Trực:** "Sau phần tổng quan, chúng ta đi vào công cụ đầu tiên: Qdrant, một lựa chọn rất mạnh khi RAG cần metadata filter."

### Phần D - Trần Lê Trung Trực: Qdrant, comparison và quantization

#### Slide 11 - Qdrant: kiến trúc tối giản cho filtered retrieval

**Nội dung cần nói:**

"Qdrant được thiết kế như một single binary, ít dependency, nên triển khai local/self-host rất gọn. Đơn vị quan trọng là segment, trong đó gồm vector, payload metadata và HNSW index. WAL bảo vệ write path, còn Rust giúp tránh garbage collection pause và giảm rủi ro memory bug."

**Điểm nhấn:** Qdrant phù hợp RAG có metadata như tenant, ACL, timestamp, document type.

#### Slide 12 - Qdrant và bài toán truy hồi có filter

**Nội dung cần nói:**

"Trong RAG production, filter gần như lúc nào cũng có: user thuộc tenant nào, có quyền xem tài liệu nào, tài liệu thuộc năm nào, môn học nào. Nếu filter làm sau khi search, có thể không đủ Top-K hợp lệ. Nếu filter trước, graph có thể bị thưa. Qdrant đưa payload filter vào quá trình duyệt HNSW, nên phù hợp với workload filter-heavy."

**Bổ sung:** Giải thích adaptive behavior:

- Filter rộng: vẫn duyệt graph HNSW.
- Filter rất hẹp: planner có thể dựa vào payload index và brute-force tập nhỏ.

#### Slide 13 - Ba chiến lược kết hợp vector search và metadata

**Nội dung cần nói:**

"Có ba cách xử lý filter. Pre-filter lọc trước nhưng có nguy cơ làm graph thưa. Post-filter search trước rồi loại kết quả, nhưng có nguy cơ thiếu Top-K. In-graph filtering kiểm tra filter trong khi duyệt graph, nên phù hợp với RAG cần tenant isolation và metadata constraint."

**Câu chốt:** "Điểm mạnh của Qdrant không phải chỉ là có filter, mà là filter nằm gần với đường đi search."

#### Slide 14 - Ma trận so sánh kiến trúc

**Nội dung cần nói:**

"Đến đây có thể tóm tắt: Qdrant thắng ở filtered performance và footprint gọn; Weaviate thắng ở hybrid RAG ergonomics; Milvus thắng ở distributed scale. Câu hỏi đúng không phải 'DB nào tốt nhất', mà là 'ràng buộc nào quan trọng nhất'."

**Chuyển tiếp:** "Ngoài kiến trúc search, một điểm production quan trọng nữa là quantization."

#### Slide 15 - Chiến lược Vector Quantization

**Nội dung cần nói:**

"Embedding thường là float32, nếu corpus lớn thì RAM nhanh thành bottleneck. Quantization giảm kích thước vector: scalar quantization chuyển float32 sang uint8, product quantization chia vector thành sub-vector, binary quantization biến vector thành biểu diễn 1-bit. Đổi lại, Recall@K có thể giảm, nên mỗi cấu hình quantization phải benchmark lại."

**Điểm nhấn:** "Qdrant có bộ công cụ quantization rất đầy đủ; Milvus cũng mạnh ở hướng index/disk-scale; Weaviate có một số lựa chọn nhưng điểm nổi bật chính vẫn là hybrid retrieval."

**Chuyển giao sang Tuấn:** "Qdrant xử lý tốt filter. Tiếp theo, Tuấn sẽ trình bày Weaviate, nơi Hybrid Search là năng lực trung tâm."

### Phần B - Nguyễn Hồ Anh Tuấn: Weaviate và evaluation methodology/tradeoff

#### Slide 16 - Weaviate: schema mô-đun cho ứng dụng RAG

**Nội dung cần nói:**

"Weaviate không chỉ là ANN engine. Trong cùng shard, nó quản lý object store, vector HNSW index và inverted index. Vì có inverted index, Weaviate hỗ trợ BM25/keyword search tự nhiên hơn nhiều hệ chỉ tập trung vào dense vector."

**Bổ sung:** Nếu nói về RAG app, nhấn mạnh Weaviate có API gần với workflow ML/RAG, module vectorizer/generative/reranker.

#### Slide 17 - Hybrid Search: kết hợp keyword và semantic retrieval

**Nội dung cần nói:**

"Vector search mạnh với paraphrase và đồng nghĩa, nhưng có thể bỏ sót mã lỗi, tên riêng, mã sản phẩm. BM25 mạnh với keyword chính xác, nhưng không hiểu ngữ nghĩa. Hybrid Search kết hợp hai tín hiệu này. Tham số alpha điều chỉnh trọng số: alpha gần 0 nghiêng về keyword, alpha gần 1 nghiêng về vector."

**Ví dụ:** "Nếu query là 'lỗi E042 trong module thanh toán', keyword E042 rất quan trọng. Nếu query là 'vì sao hệ thống chậm khi truy vấn', semantic similarity quan trọng hơn."

#### Slide 18 - RRF: hợp nhất hai bảng xếp hạng

**Nội dung cần nói:**

"BM25 score và cosine similarity khác thang đo, nên cộng điểm trực tiếp có thể không ổn định. Reciprocal Rank Fusion dùng vị trí xếp hạng thay vì raw score. Document đứng hạng cao ở BM25 hoặc vector sẽ được cộng điểm lớn hơn."

**Cách giải thích công thức:**

"Với mỗi danh sách xếp hạng, document ở rank càng nhỏ thì mẫu số `k + rank` càng nhỏ, điểm càng cao. Tổng điểm qua nhiều nguồn cho ra bảng xếp hạng cuối."

#### Slide 19 - Giao thức benchmark công bằng

**Nội dung cần nói:**

"Để so sánh công bằng, nhóm kiểm soát các biến: cùng corpus, cùng chunk size/overlap, cùng embedding model, cùng query set, cùng Top-K, cùng hardware và cùng HNSW config. Config chung trong README là Cosine, HNSW, M=16, ef_construction=128, ef_search=64."

**Lưu ý:** "Công bằng không có nghĩa là ép mỗi database có lifecycle giống nhau. Milvus có flush/load, Weaviate có hybrid alpha, Qdrant có payload planner; nhóm cần ghi rõ khi diễn giải."

#### Slide 20 - Đánh đổi accuracy-speed và Pareto Frontier

**Nội dung cần nói:**

"Biểu đồ tradeoff giúp nhìn đồng thời recall và latency. Điểm tốt nằm cao và lệch trái: recall cao, latency thấp. Khi tăng top_k, recall có thể tăng nhưng latency và chi phí LLM context cũng tăng. Lựa chọn cấu hình phải dựa trên SLA."

**Số liệu snapshot cần nắm:**

- Milvus top_k=10: Recall 44.0, AvgLatency 3.88 ms.
- Qdrant top_k=10: Recall 9.5, AvgLatency 4.87 ms.
- Weaviate top_k=10: Recall 9.5, AvgLatency 15.49 ms.

**Chuyển giao sang Thành:** "Weaviate cho thấy giá trị của hybrid retrieval. Tiếp theo Thành sẽ trình bày Milvus, công cụ được thiết kế cho scale lớn và kiến trúc phân tán."

### Phần C - Trần Hữu Kim Thành: Milvus, HA và kết luận

#### Slide 21 - Milvus: kiến trúc phân tán shared-storage

**Nội dung cần nói:**

"Milvus khác hai công cụ trước vì thiết kế distributed-first. Proxy nhận request, Coordinator quản lý metadata và topology, Worker nodes xử lý ingest/search/index, Storage layer gồm object storage, message queue và etcd. Cách thiết kế này nặng hơn, nhưng cho phép scale từng phần độc lập."

**Điểm nhấn:** "Search chậm thì thêm QueryNode, ingest chậm thì thêm DataNode, build index chậm thì thêm IndexNode."

#### Slide 22 - Scale phân tán và Knowhere Engine

**Nội dung cần nói:**

"Knowhere là lớp thực thi vector search bên dưới Milvus, wrap các thư viện như Faiss, HNSWlib, ScaNN, DiskANN và có đường GPU khi có CUDA. Đây là lý do Milvus phù hợp bài toán corpus rất lớn, enterprise RAG, hoặc hệ thống cần scale độc lập."

**Câu chốt:** "Đổi lại, chi phí vận hành Milvus cao hơn Qdrant và Weaviate."

#### Slide 23 - Vòng đời dữ liệu và bẫy vận hành

**Nội dung cần nói:**

"Milvus có lifecycle rõ hơn. Insert đưa dữ liệu vào growing segment. Growing segment có thể search bằng brute-force. Flush đóng segment thành sealed segment và persist ra object storage. Sau đó build index, load vào QueryNode RAM, rồi search tối ưu. Khi benchmark Milvus, cần tách insert, flush, load và search, nếu không sẽ kết luận sai về latency."

**Cần nhấn mạnh:** "Không nên flush quá thường xuyên với batch nhỏ vì tạo nhiều sealed segment nhỏ, gây I/O amplification."

#### Slide 24 - Milvus HA và khả năng chịu lỗi

**Nội dung cần nói:**

"Milvus hỗ trợ HA thông qua etcd quorum cho metadata, coordinator failover, QueryNode replica cho serving availability, và message queue lưu ingestion stream. Các tính năng như DiskANN, Time Travel, CDC, GPU index cho thấy Milvus hướng đến production lớn."

**Câu chốt:** "Milvus đáng giá khi scale và HA quan trọng hơn sự đơn giản."

#### Slide 25 - Telemetry tài nguyên: latency và RAM

**Người nói chính:** Trí có thể quay lại nói slide này nếu dùng theo master plan; nếu muốn liền mạch, Thành nói phần Milvus, Trí bổ sung 30 giây số liệu.

**Nội dung cần nói:**

"Đây là telemetry từ dashboard. Latency live có thể dao động theo warm-up, cache, Docker và tiến trình nền. Vì vậy nhóm dùng snapshot để kết luận và live demo để chứng minh pipeline hoạt động."

**Nhận xét cẩn thận:**

- Weaviate có thể có p50 thấp trong search path tùy trạng thái live.
- Qdrant có footprint gọn và latency thấp trong snapshot accuracy.
- Milvus có recall tốt trong snapshot tradeoff, nhưng lifecycle và tail latency cần đọc riêng.

#### Slide 26 - Độ chính xác truy hồi: Recall@K và MRR

**Người nói chính:** Trí.

**Nội dung cần nói:**

"Latency thấp không đủ. Nếu Top-K chunk không chứa evidence đúng, LLM sẽ trả lời kém. Snapshot hiện tại: Milvus Recall@1 = 18.0, Recall@5 = 34.0, Recall@10 = 44.0, MRR = 0.2492, AvgLatency = 4.14 ms. Qdrant Recall@10 = 9.5, AvgLatency = 4.83 ms. Weaviate Recall@10 = 9.5, AvgLatency = 14.47 ms."

**Diễn giải bắt buộc:** "Kết quả này là snapshot của project, không phải chân lý tuyệt đối cho mọi production workload."

#### Slide 27 - Ma trận Developer Experience

**Người nói chính:** Thành, sau khi Trí nói benchmark.

**Nội dung cần nói:**

"Developer Experience không chỉ là số dòng code. Nó gồm setup, mental model, debugging, schema evolution, dependency graph và monitoring. Qdrant dễ prototype vì ít dependency. Weaviate tốt cho RAG app vì API hybrid rõ. Milvus mạnh nhưng đòi hỏi năng lực vận hành cao hơn."

#### Slide 28 - Ma trận quyết định cuối cùng

**Nội dung cần nói:**

"Kết luận theo use case: chọn Qdrant nếu cần filtered retrieval, multi-tenant payload và footprint thấp. Chọn Weaviate nếu cần Hybrid Search, BM25F + semantic retrieval và DX tốt cho RAG app. Chọn Milvus nếu corpus rất lớn, cần HA, distributed production, GPU hoặc DiskANN path."

**Câu chốt quan trọng:** "Không có 'best Vector Database' tuyệt đối."

#### Slide 29 - Thank you / Q&A

**Nội dung cần nói:**

"Phần trình bày của nhóm kết thúc tại đây. Nhóm sẵn sàng nhận câu hỏi về kiến trúc RAG, giao thức benchmark, và lý do lựa chọn Qdrant, Weaviate hoặc Milvus trong từng bối cảnh."

## 4. Thứ tự demo để chạy sau slide

Nếu demo live, dùng **một laptop duy nhất** đã chạy trước Docker Compose. Không demo cài đặt, không tải model, không chạy benchmark nặng ngay trên lớp nếu không chắc máy ổn định.

### Chuẩn bị trước khi demo

Từ thư mục gốc project `/home/pearspringmind/Studying/Big Data/Seminar`:

```bash
docker compose up -d
curl http://localhost:8000/api/v1/health
```

Kết quả mong đợi:

```json
{"status":"ok","databases":{"Qdrant":true,"Weaviate":true,"Milvus":true}}
```

Mở sẵn:

- React Dashboard: `http://localhost:5173`
- FastAPI Docs: `http://localhost:8000/docs`
- Qdrant Dashboard: `http://localhost:6333/dashboard`

### Demo 1 - Dashboard tổng quan

**Người phụ trách:** Trí  
**Trang:** `/dashboard`  
**Thời lượng:** 45-60 giây

Nói:

"Đây là dashboard tổng quan của hệ thống. Cùng một pipeline RAG, nhóm gắn vào ba vector database để so sánh. 3D view giúp hình dung embedding space; các kết luận vẫn dựa trên metric như latency, recall và tradeoff."

### Demo 2 - Qdrant filtered search

**Người phụ trách:** Trực  
**Trang:** `/hybrid` hoặc `/rag-chat`  
**Thời lượng:** 90-120 giây

Nói:

"Qdrant được demo với query có metadata filter. Điểm cần quan sát là database vẫn trả kết quả nhanh khi có điều kiện lọc. Đây là workload rất gần với RAG nội bộ: mỗi user chỉ được xem tài liệu thuộc tenant hoặc quyền truy cập của mình."

Nếu backend live lỗi, dùng screenshot/snapshot và nói:

"Trang có fallback snapshot để đảm bảo seminar ổn định; trong phần benchmark nhóm đã lấy số liệu từ cùng pipeline."

### Demo 3 - Weaviate hybrid search

**Người phụ trách:** Tuấn  
**Trang:** `/hybrid`  
**Thời lượng:** 90-120 giây

Nói:

"Weaviate được demo ở điểm mạnh hybrid. Một truy vấn có thể kết hợp keyword và semantic. Khi alpha nhỏ, kết quả nghiêng về keyword; khi alpha lớn, kết quả nghiêng về vector. Đây là lợi thế với tài liệu kỹ thuật có mã lỗi, tên riêng, hoặc thuật ngữ chuyên ngành."

### Demo 4 - Milvus lifecycle/scale

**Người phụ trách:** Thành  
**Trang:** `/architecture`, `/rag-chat`, hoặc `/latency`  
**Thời lượng:** 90-120 giây

Nói:

"Milvus có lifecycle và kiến trúc nặng hơn. Trong demo local, ta thấy nó chạy như một service vector database, nhưng phía sau có concept Proxy, Coordinator, QueryNode, DataNode và Storage. Lợi thế này rõ nhất khi corpus lớn và cần scale độc lập."

### Demo 5 - Accuracy, tradeoff và kết luận dashboard

**Người phụ trách:** Trí  
**Trang:** `/accuracy`, `/tradeoff`  
**Thời lượng:** 90 giây

Nói:

"Đây là phần biến demo thành quyết định kỹ thuật. Accuracy cho biết retrieval đúng hay sai. Tradeoff cho thấy khi tăng top_k, recall và latency thay đổi ra sao. Nhóm không chọn database bằng cảm tính, mà dựa vào ràng buộc của bài toán."

## 5. Bảng số liệu benchmark cần nhớ

Snapshot `recall.csv`:

| Engine | Recall@1 | Recall@5 | Recall@10 | MRR | AvgLatency_ms | Errors |
|---|---:|---:|---:|---:|---:|---:|
| Milvus | 18.0 | 34.0 | 44.0 | 0.2492 | 4.14 | 0 |
| Qdrant | 3.0 | 7.5 | 9.5 | 0.0467 | 4.83 | 0 |
| Weaviate | 3.0 | 8.0 | 9.5 | 0.0472 | 14.47 | 0 |

Snapshot `tradeoff.csv`:

| Engine | top_k=1 | top_k=5 | top_k=10 | top_k=50 | Nhận xét |
|---|---:|---:|---:|---:|---|
| Milvus | 18.0 / 3.65 ms | 34.0 / 3.67 ms | 44.0 / 3.88 ms | 80.0 / 4.17 ms | Recall cao nhất trong snapshot |
| Qdrant | 3.0 / 4.57 ms | 7.5 / 4.80 ms | 9.5 / 4.87 ms | 27.0 / 5.82 ms | Latency thấp, phù hợp filtered retrieval |
| Weaviate | 3.0 / 16.19 ms | 8.0 / 15.39 ms | 9.5 / 15.49 ms | 24.5 / 15.66 ms | Điểm mạnh là hybrid search, không phải dense-only snapshot |

Khi nói số liệu, luôn thêm câu: "Đây là snapshot của cùng một benchmark environment, không phải kết luận tuyệt đối cho mọi hệ thống."

## 6. Câu hỏi dự phòng và cách trả lời

### Vì sao Milvus recall cao hơn nhiều trong snapshot?

"Do snapshot này phản ánh một workload và trạng thái benchmark cụ thể. Milvus có index/search path cho kết quả recall tốt trong lần đo này. Tuy nhiên nếu workload chuyển sang metadata filter dày đặc hoặc hybrid keyword, kết quả có thể khác. Vì vậy nhóm kết luận theo use case, không kết luận Milvus luôn tốt nhất."

### Tại sao Weaviate latency cao hơn nhưng vẫn được đánh giá mạnh?

"Vì giá trị chính của Weaviate nằm ở native Hybrid Search. Nhiều bài toán RAG không chỉ cần semantic similarity mà cần keyword chính xác như mã lỗi, tên riêng, thuật ngữ. Weaviate có BM25/inverted index và vector search trong cùng query engine."

### Tại sao Qdrant phù hợp startup hoặc RAG nội bộ?

"Qdrant gọn, ít dependency, API payload filter rõ, footprint thấp và triển khai nhanh. Nếu ứng dụng cần tenant, ACL, timestamp, document type filter, Qdrant là baseline rất mạnh."

### Vì sao không chạy benchmark live trên lớp?

"Benchmark live phụ thuộc Docker warm-up, cache, tải CPU/RAM và model local. Chạy live để chứng minh pipeline, còn snapshot dùng để trình bày kết quả ổn định và có thể lặp lại."

### Nếu thầy hỏi pipeline có dùng app thật không?

"Có. README mô tả hệ thống full-stack gồm React + Three.js frontend, FastAPI backend, Python core benchmark, Qdrant, Weaviate, Milvus và Ollama. Các endpoint chính gồm health, metrics, resources, ingest, chat, accuracy benchmark và tradeoff benchmark."

## 7. Checklist tập luyện trước khi thuyết trình

- Trí tập mở đầu 2 phút đầu thật rõ: RAG là gì, tại sao Vector Database quan trọng.
- Trực tập giải thích pre-filter, post-filter, in-graph filter bằng ví dụ tenant/ACL.
- Tuấn tập giải thích alpha và RRF không quá nặng toán; nói bằng trực quan ranking.
- Thành tập giải thích Milvus lifecycle: insert -> growing -> flush -> sealed -> build index -> load -> search.
- Cả nhóm thống nhất câu chốt: "Không có database tốt nhất tuyệt đối; chỉ có database phù hợp nhất với ràng buộc."
- Demo phải có fallback: nếu Docker/API lỗi, dùng screenshot trong `screenshot/` và snapshot CSV trong `frontend/public/benchmark-data/combined/`.

## 8. Ghi chú về Docker

Tại thời điểm tạo tài liệu này, không có container Docker nao đang chạy. Tuy nhiên thông tin cần để phân công và viết nội dung thuyết trình đã có đủ trong slide, README, docs và snapshot CSV nên chưa cần khởi động Docker.

Nếu cần kiểm tra app thật trước buổi thuyết trình, chạy tại thư mục gốc project:

```bash
cd "/home/pearspringmind/Studying/Big Data/Seminar"
docker compose up -d
curl http://localhost:8000/api/v1/health
```

Nếu health của database nào false, ưu tiên dùng snapshot/screenshot khi demo để tránh mất thời gian trên lớp.
