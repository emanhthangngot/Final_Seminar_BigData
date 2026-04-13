# Kế hoạch Tổng thể & Tích hợp Nhóm (Team Integration)

## 1. Mục tiêu Tối Thượng
Hoàn thiện toàn bộ bài Benchmark kiểm thử RAG Project. Nhằm mục đích thuyết trình phân tích Seminar môn Big Data trực quan, có giá trị học thuật điểm 10, chứng thực những Trade-offs so sánh tài nguyên của hệ ba Vector Database lớn: Qdrant, Weaviate, Milvus.

## 2. Ràng buộc Môi trường Đồng nhất Hệ thống
Đảm bảo tính nhất quán môi trường để kết quả đo kiểm hiệu suất được chính xác:
- **Ngôn ngữ Code:** Bắt buộc tuân thủ mã hoá bằng Python 3.11 trong `venv` độc lập.
- **Dependency:** Cài qua chung `requirements.txt` tránh phiên bản xung đột cho các công nghệ cốt yếu: `streamlit`, `langchain`, `pypdf`, SDK của 3 DB, `ollama`.
- **Infrastructure:** Triển khai chung 1 file tổng lệnh `docker-compose.yml`. Mọi DB được khởi tạo đồng nhất chung 1 Network Bridge, phải áp đặt giới hạn bộ nhớ `mem_limit` chống sập OS host khi bật cả Milvus, Weaviate, Qdrant chạy cùng lúc.
- **Tiêu chuẩn Dữ liệu:** Đồng bộ duy nhất một Embeddings Cục Bộ: Ollama API chạy model `nomic-embed-text` xuất chuẩn vector 768 chiều. Thư mục lấy nguồn chung là bộ 10 File PDF từ dữ kiện quá khứ. Cố định biến ngẫu nhiên hạt giống (`Fixed Seed`).

## 3. Chuẩn Giao Tiếp & Fairness Protocol

Việc thiết kế phải tuân thủ hướng đối tượng và phục vụ 4 trụ cột đánh giá:
**Latency · Recall@K / MRR · Recall-vs-Latency Pareto Curve · DX Matrix**.

### Fairness Protocol — Bắt buộc cho cả B, C, D

Không được hardcode bất kỳ giá trị benchmark-sensitive nào. Tất cả phải đọc từ
`src.config`:

```python
from src.config import INDEX_PARAMS  # {metric, index_type, M, ef_construction, ef_search}
```

- **HNSW M**, **ef_construction**, **ef_search**, **distance metric** → giống nhau cho cả 3 DB.
- **Corpus**: lấy từ `src.core.benchmark.dataset.build_corpus()` (seed cố định).
- **Queries**: lấy từ `build_golden_queries()` (seed cố định).
- **Ground truth**: so khớp `[CID:…]` tag — không dùng substring / LLM judge.

Reviewer (A) sẽ reject PR nếu wrapper nào còn literal `M=16` / `ef=64` hardcoded.

```python
# Cấu trúc Interface bắt buộc tại src/core/db_clients/base.py
class BaseVectorDB(ABC):
    @abstractmethod
    def connect(self): pass
    
    @abstractmethod 
    @time_profiler
    def insert(self, chunks: list, metadata: list): pass
    
    @abstractmethod
    @time_profiler
    def search(self, query: list, top_k: int = 5): pass

    @abstractmethod
    @time_profiler
    def search_hybrid(self, query_text: str, query_embedding: list, filters: dict, top_k: int = 5): pass
```
```
Ba cá nhân lập trình DB (B, C, D) tuyệt đối nối Interface chính xác với Orchestration Pipeline mà Người đảm nhận nền tảng A gọi xuống, tránh phát sinh lỗi sai lệch hàm khi Runtime thao tác Streamlit UI.

## 4. Quản lý Source Code Control (GitHub)
- **Branching Rule:** Tất cả commit chia việc phải tạo nhánh riêng, Format: `task/<giai_doan>/<member_id>/<ten_tinh_nang>`. VD: `task/G2/memA/streamlit-dashboard`.
- **Merge Logic:** Muốn merge vào master / main branch bắt buộc phải có Pull Request, đồng thời yêu cầu 1 người đồng thuận phê duyệt. Tuyệt đối không commit linh tinh vào Master.
- **Commit Format:** Rành mạch: `[DB/Thành_Phần] Action: Description` để dễ track lịch sử. VD: `[QDRANT] Add: Payload filter structure`.

## 5. Output Giao Nộp Thành Phẩm (Deliverables)
Để bài báo cáo được đánh giá tốt nhất, nhóm nộp đầy đủ các học liệu sau vào tuần 4:
1. **Source Code Zip:** Có kẹp `README.md` chuyên nghiệp với hướng dẫn gõ duy nhất `docker compose up` là thầy giáo test lại được y hệt không lệch 1 mili giây kết quả. Tập trung logging lưu về `src/core/benchmark/metrics.csv`. Dữ liệu vật lý nằm trong `./volumes/`.
2. **Báo Cáo Word (Technical Report):** Cỡ 10-15 trang; So sánh tường minh Architecture Diagram của từng CSDL, giải phẫu bảng giá, số sao Github, tốc độ lõi (C++, Rust, Go) mà không dùng máy sinh nội dung.
3. **Thuyết trình Slide Present:** Báo cáo thời lượng 30 phút. Rút gọn cấu hình, trực diện demo Trade-offs sức mạnh 3 cơ sở dữ liệu qua Bar/Radar Chart. 
4. **Video Demo Live:** Demo mượt mà không lỗi hệ thống chức năng hỏi đáp cùng file PDF môn học. Cả 4 thành viên am hiểu kỹ càng để luân phiên đối đáp với Teacher trong phần Hỏi-Đáp.
