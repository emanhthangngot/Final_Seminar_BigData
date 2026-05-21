# 🎤 Q&A DỰ PHÒNG — 15 PHÚT HỎI ĐÁP

**Nguyên tắc trả lời:**
- Người được hỏi về tool nào → specialist tool đó trả lời
- Câu tổng quan / so sánh → A (Architect) trả lời
- Không biết → thành thật nói "Chúng tôi chưa khảo sát điểm này" rồi đưa hướng suy luận
- Mỗi câu trả lời **tối đa 1 phút** — ngắn gọn, có evidence

---

## MỨC 1: CƠ BẢN (Giảng viên/bạn chưa biết VectorDB)

### Q1. "HNSW là gì? Tại sao cả 3 DB đều dùng?"

**Trả lời:** A

> HNSW — Hierarchical Navigable Small World — là thuật toán tìm kiếm gần đúng (ANN) dạng đồ thị đa tầng. Nó xây dựng nhiều layer, layer trên thưa (skip-list), layer dưới dày. Khi search, bắt đầu từ layer cao nhất, nhảy nhanh đến vùng gần, rồi xuống layer thấp tìm chính xác.
>
> Cả 3 DB đều dùng vì HNSW cho **recall cao + latency thấp** (sub-10ms) trên tập dữ liệu hàng triệu vector, và quan trọng nhất: hỗ trợ **incremental insert** — không cần rebuild index khi thêm data mới, rất phù hợp cho RAG.

**Câu chốt:** "HNSW là tiêu chuẩn ngành hiện tại cho ANN search vì balance tốt giữa tốc độ, độ chính xác và khả năng cập nhật."

---

### Q2. "Cosine Similarity là gì? Sao không dùng Euclidean?"

**Trả lời:** A

> Cosine Similarity đo **góc** giữa 2 vector, giá trị từ -1 đến 1. Nó bỏ qua độ dài vector, chỉ quan tâm **hướng** — phù hợp cho text embedding vì 2 đoạn văn giống nghĩa sẽ có vector cùng hướng dù độ dài khác nhau.
>
> Euclidean đo **khoảng cách** tuyệt đối — nhạy cảm với magnitude. Nếu 2 embedding model sinh vector có scale khác nhau, Euclidean cho kết quả sai lệch. Cosine normalize tự động nên ổn định hơn.

**Câu chốt:** "Trong project, cả 3 DB đều cấu hình COSINE metric theo Fairness Protocol."

---

### Q3. "RAG khác fine-tuning LLM như thế nào?"

**Trả lời:** A

> Fine-tuning thay đổi **trọng số** model — tốn GPU, cần data huấn luyện, model bị "đóng băng" sau khi train. RAG giữ model nguyên, chỉ bổ sung **context** từ external knowledge base khi query — cập nhật real-time, không cần GPU train.
>
> RAG phù hợp khi data thay đổi liên tục (tài liệu công ty, tin tức). Fine-tuning phù hợp khi cần model hiểu sâu một domain cố định.

---

## MỨC 2: KIẾN TRÚC (Giảng viên hỏi sâu về thiết kế)

### Q4. "Tại sao Qdrant chọn Rust thay vì C++ như Milvus?"

**Trả lời:** D

> Rust cho **memory safety tại compile time** — không có null pointer, data race, use-after-free mà không cần Garbage Collector. C++ mạnh về hiệu năng tương đương nhưng dễ gặp memory bug trong production.
>
> Qdrant muốn latency cực thấp + single-binary đơn giản → Rust đáp ứng cả hai: zero-cost abstractions và an toàn bộ nhớ. Milvus chọn C++ vì Knowhere cần wrap nhiều thư viện C/C++ có sẵn (Faiss, HNSWlib) và cần GPU CUDA integration.

**Câu chốt:** "Mỗi ngôn ngữ phục vụ triết lý khác nhau: Rust cho safety+speed, C++ cho library ecosystem+GPU."

---

### Q5. "Filterable HNSW cụ thể implement thế nào? Có tăng thời gian build index không?"

**Trả lời:** D

> Khi build index HNSW, Qdrant vẫn build graph bình thường — **không tăng thời gian build**. Filter chỉ áp dụng **lúc search**: tại mỗi bước traverse graph, kiểm tra payload index xem node có match filter không. Không match → skip node đó nhưng vẫn duyệt neighbor của nó → giữ graph connectivity.
>
> Query Planner tự chọn: filter match nhiều → dùng graph traversal + skip; filter match ít (< vài trăm points) → bypass HNSW, brute-force trực tiếp trên payload index.

---

### Q6. "BM25F khác BM25 thông thường chỗ nào?"

**Trả lời:** B

> BM25 truyền thống coi toàn bộ document là 1 field. BM25**F** (Field) cho phép **đặt trọng số khác nhau cho từng field**. Ví dụ: `title × 2.0 + abstract × 1.5 + body × 1.0` — từ khóa xuất hiện trong title sẽ được tính điểm cao hơn trong body.
>
> Weaviate implement BM25F native trong inverted index, nằm cùng shard với HNSW → không cần external search engine như Elasticsearch.

---

### Q7. "Milvus tách Storage và Compute — vậy network latency có ảnh hưởng không?"

**Trả lời:** C

> Có, nhưng được giảm thiểu. Khi Query Node load index, nó **cache index trong RAM** — search thuần local, không gọi MinIO mỗi query. Network latency chỉ xảy ra khi: (1) load/reload segment từ MinIO, (2) flush data từ Data Node ra MinIO, (3) metadata sync qua etcd.
>
> Search latency thực đo: ~6.88ms — comparable với Qdrant, chứng tỏ network overhead không ảnh hưởng search path. Trade-off nằm ở **khởi tạo** (flush+load ~5.7s) chứ không phải query.

---

### Q8. "Tại sao Milvus cần etcd? Qdrant/Weaviate không cần?"

**Trả lời:** C

> etcd là distributed key-value store dùng Raft consensus — Milvus dùng để lưu metadata (collection schema, segment allocation, node topology) và service discovery. Vì Milvus có nhiều service (Proxy, Coordinator, Worker Nodes), cần 1 nguồn sự thật duy nhất.
>
> Qdrant và Weaviate là single-binary → metadata nằm trong process, không cần external coordination. Đây là trade-off: đơn giản vs khả năng HA và scale.

---

## MỨC 3: BENCHMARK & PHƯƠNG PHÁP

### Q9. "Recall@5 = 0% mà nói pipeline đúng — giải thích?"

**Trả lời:** A

> MockEmbedder sinh vector từ SHA-256 hash của text — mỗi string cho vector **hoàn toàn khác nhau**, không có quan hệ ngữ nghĩa. Query lấy 14 từ từ chunk gốc → hash khác → vector khác → không match → Recall = 0%. Đây chính là hành vi đúng — chứng minh pipeline không bị cheat.
>
> Với Ollama nomic-embed-text (real embedder), query substring sẽ có vector gần chunk gốc → Recall@5 dự kiến ≥ 80%.

**Câu chốt:** "Recall 0% với mock = pipeline trung thực. Recall 0% với real embedder = pipeline hỏng."

---

### Q10. "Fairness Protocol có thực sự công bằng không? HNSW params giống nhau nhưng implementation khác nhau thì sao?"

**Trả lời:** A

> Đúng, M=16 và ef=64 giống nhau nhưng mỗi DB implement HNSW hơi khác: Qdrant custom Rust, Weaviate custom Go, Milvus wrap HNSWlib C++. Tuy nhiên, thuật toán HNSW core giống nhau — cùng paper gốc (Malkov & Yashunin 2018). Sự khác biệt nằm ở overhead ngôn ngữ, memory layout, SIMD optimization.
>
> Đây chính xác là điều benchmark muốn đo: **với cùng thuật toán, implementation nào hiệu quả hơn?** Nếu params khác nhau thì benchmark vô nghĩa.

---

### Q11. "Sao không dùng dataset thật (Wikipedia, MS MARCO) thay vì synthetic?"

**Trả lời:** A

> Synthetic corpus cho phép **ground-truth chính xác 100%** — mỗi chunk có ID, query lấy substring từ chunk → biết chắc chunk nào đúng. Dataset thật (Wikipedia) cần human annotation hoặc LLM judge → chủ quan, không reproducible.
>
> Ngoài ra, synthetic corpus seed cố định → ai chạy lại cũng ra cùng kết quả. Đây là yêu cầu bắt buộc cho benchmarking học thuật.

---

### Q12. "Top_k = 5 là sweet spot — dựa trên cơ sở nào?"

**Trả lời:** B

> Từ tradeoff sweep: top_k=1 recall thấp, top_k=50 latency cao nhưng recall tăng không đáng kể. top_k=5 nằm ở "đầu gối" của đường curve — recall tăng mạnh nhất so với latency bỏ ra. Trong bài toán RAG thực tế, LLM chỉ cần 3-5 chunk context là đủ sinh câu trả lời tốt — nhiều hơn dễ gây noise.

---

## MỨC 4: PRODUCTION & THỰC TẾ

### Q13. "Nếu phải chọn 1 cho startup AI, chọn cái nào?"

**Trả lời:** D

> **Qdrant** — vì: (1) 1 container duy nhất, chạy Docker là xong, (2) RAM ~79 MB, chạy được trên laptop dev, (3) dữ liệu ready ngay sau insert — không cần flush/load, (4) API đơn giản, DX score cao nhất trong 3.
>
> Khi startup scale lên 50M+ vectors, lúc đó mới cần đánh giá lại Milvus.

---

### Q14. "Quantization giảm RAM nhưng Recall có giảm không? Giảm bao nhiêu?"

**Trả lời:** D

> Scalar Quantization (float32→uint8): recall giảm khoảng 1-2%, thường chấp nhận được. Product Quantization: recall giảm rõ hơn (5-10%) nhưng có thể dùng **rescoring** — oversampling 3-5x trên quantized vectors rồi rescore bằng original vectors từ disk → recall phục hồi gần 100%.
>
> Binary Quantization cực đoan nhất — chỉ phù hợp khi model embedding đã được thiết kế cho binary (như Cohere Embed v3).

---

### Q15. "Milvus standalone chạy 3 container — production có cần nhiều hơn không?"

**Trả lời:** C

> Production distributed Milvus cần: nhiều Proxy (load balance), 3+ etcd nodes (Raft quorum), MinIO cluster (replication), và nhiều Query/Data/Index Nodes. Tổng có thể **20-30 containers** cho hệ thống enterprise.
>
> Standalone (3 containers) chỉ dùng cho dev/test. Zilliz Cloud là managed service giúp tránh quản lý infra phức tạp.

---

### Q16. "Weaviate Module System có overhead không? Load module có làm chậm query?"

**Trả lời:** B

> Module chạy **cùng process** Weaviate, không phải sidecar. Overhead phụ thuộc loại module: vectorizer module thêm latency tại import time (embedding), nhưng search time không bị ảnh hưởng nếu đã index.
>
> Trong benchmark, chúng tôi set `vectorizer_config=None` — Weaviate không tự embedding, chỉ nhận vector sẵn → loại bỏ hoàn toàn module overhead, đảm bảo fairness.

---

### Q17. "Go có Garbage Collector — có gây latency spike cho Weaviate không?"

**Trả lời:** B

> Go GC hiện đại (Go 1.19+) có latency rất thấp — GC pause thường < 1ms. Weaviate team đã optimize memory allocation pattern để giảm GC pressure. Trong benchmark, chúng tôi không quan sát thấy latency spike bất thường ở Weaviate.
>
> So sánh: Rust (Qdrant) không có GC nên latency ổn định tuyệt đối. C++ (Milvus Knowhere) cũng không GC. Đây là lý do Qdrant thường có p99 latency thấp nhất.

---

### Q18. "DiskANN của Milvus hoạt động thế nào?"

**Trả lời:** C

> DiskANN xây index trên SSD thay vì RAM — cho phép search trên dataset **vượt RAM** (billion-scale) với chi phí rất thấp. Thuật toán: xây graph trên disk, cache 1 phần hot nodes trong RAM, dùng beam search trên SSD.
>
> Trade-off: latency cao hơn HNSW in-memory (ms vs sub-ms) nhưng chi phí hạ tầng giảm nhiều lần. Phù hợp khi dataset >100M vectors và budget RAM hạn chế.

---

### Q19. "Có thể chạy cả 3 DB trên production song song không?"

**Trả lời:** A

> Về kỹ thuật: có thể. Một số công ty dùng **polyglot persistence** — Qdrant cho real-time search, Weaviate cho hybrid RAG app, Milvus cho batch analytics. Nhưng thực tế: quản lý 3 DB tốn operational overhead lớn. Khuyến nghị: chọn 1 phù hợp nhất, chỉ dùng thêm khi có use-case rõ ràng.

---

### Q20. "Project này có gì khác so với chỉ đọc documentation?"

**Trả lời:** A (cả nhóm bổ sung)

> 3 điểm khác biệt: (1) **Benchmark thực tế** trên cùng hardware, cùng params — documentation chỉ có benchmark riêng lẻ, không so sánh công bằng. (2) **Full-stack system** — từ React Dashboard đến FastAPI đến 3 DB, chứng minh chạy được thật. (3) **Đính chính hiểu lầm** — ví dụ nhiều nguồn nói Milvus phải flush trước khi search, nhưng thực tế Growing Segment cho search brute-force ngay.

**Câu chốt:** "Chúng tôi không chỉ đọc docs — chúng tôi build, đo, và verify."

---

## PHÂN CÔNG TRẢ LỜI NHANH

| Loại câu hỏi | Ai trả lời |
|---|---|
| Tổng quan, RAG, Methodology | **A** (Trí) |
| Weaviate, Hybrid, BM25, Go, Module | **B** (Tuấn) |
| Milvus, Distributed, etcd, Lifecycle | **C** (Thành) |
| Qdrant, Rust, Filter, Quantization | **D** (Trực) |
| So sánh / chọn tool nào | A hoặc specialist liên quan |
| Không biết | Nói thật + đưa hướng suy luận |
