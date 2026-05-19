# Rà Soát Repo Lần Cuối Trước Khi Nộp

Ngày rà soát: 2026-05-19  
Phạm vi: backend FastAPI/Python, frontend Vite/React, Docker Compose, cấu hình môi trường, test hiện có.

## Tóm Tắt

Repo nhìn chung có cấu trúc rõ ràng và các kiểm tra chính đã qua: frontend build OK, backend unittest OK, Docker Compose parse OK, git working tree sạch. Các vấn đề đáng lưu ý nhất nằm ở độ ổn định khi khởi động bằng Docker, tính nhất quán của import/symlink Python, và một mismatch model trong `.env.example`.

## Findings

### High - `/health` có thể báo `status: ok` dù chưa kết nối đủ database

File liên quan:
- `docker-compose.yml`
- `backend/app/services/database_service.py`
- `backend/app/routers/health.py`

Nhận xét:
- `depends_on` trong `docker-compose.yml` chỉ đảm bảo container đã start, không đảm bảo Qdrant, Weaviate, Milvus, Ollama đã sẵn sàng nhận kết nối.
- Backend chỉ gọi `connect_all()` một lần lúc startup. Nếu DB lên chậm, kết nối thất bại sẽ bị log rồi bỏ qua.
- `db_service.health()` hiện chỉ trả về những database đã kết nối thành công. Endpoint `/health` vẫn trả `"status": "ok"`, nên người demo có thể tưởng hệ thống OK trong khi thiếu một hoặc nhiều DB.

Gợi ý sửa:
- Thêm `healthcheck` cho Qdrant, Weaviate, Milvus, Ollama.
- Đổi `depends_on` sang `condition: service_healthy` cho các service có healthcheck.
- Thêm retry/backoff trong `DatabaseService.connect_all()`.
- Đổi `health()` để luôn trả đủ `Qdrant`, `Weaviate`, `Milvus` với giá trị `true/false`; nếu thiếu DB thì `status` nên là `degraded` hoặc endpoint trả rõ lỗi.

### Medium - `.env.example` mismatch model Ollama

File liên quan:
- `.env.example`
- `docker-compose.yml`
- `src/config.py`
- `README.md`

Nhận xét:
- `.env.example` đang để `LLM_MODEL=qwen2.5:3b`.
- README, `src/config.py`, `docker-compose.yml`, và `ollama-init` đều dùng hoặc pull `qwen2.5:1.5b`.
- Nếu người chấm bài copy `.env.example` thành `.env`, backend có thể gọi model `qwen2.5:3b` trong khi compose không pull model này, dẫn đến chat fail.

Gợi ý sửa:
- Đổi `.env.example` về `LLM_MODEL=qwen2.5:1.5b`.
- Hoặc nếu muốn dùng `3b`, cập nhật README/config/compose và pull thêm `qwen2.5:3b`.

### Medium - Import Python phụ thuộc symlink và `sys.path`

File liên quan:
- `backend/core -> ../src/core`
- `backend/config.py -> ../src/config.py`
- `backend/app/services/database_service.py`
- `backend/app/services/benchmark_service.py`
- `backend/app/services/chat_service.py`
- `backend/app/services/ingest_service.py`

Nhận xét:
- Repo đang track symlink `backend/core` và `backend/config.py`.
- Code dùng lẫn các kiểu import: `core...`, `src...`, `config`, kèm `sys.path.insert(...)`.
- Docker/Linux có thể chạy được, nhưng nếu nộp bằng zip, copy qua Windows, hoặc môi trường không preserve symlink thì backend dễ lỗi import.

Gợi ý sửa:
- Thống nhất import theo một chuẩn, tốt nhất là `src.core...` và `src.config`.
- Bỏ `backend/core`, `backend/config.py` symlink nếu không cần.
- Bỏ các `sys.path.insert(...)` trong service/router sau khi package path đã ổn định.
- Nếu cần chạy backend như package riêng, cần cấu hình packaging/PYTHONPATH rõ ràng trong README và Dockerfile.

### Low - Logger tạo `FileHandler` trước khi check handler tồn tại

File liên quan:
- `src/core/utils/logger.py`

Nhận xét:
- `setup_logger()` tạo `logging.FileHandler(...)` trước `if not logger.handlers`.
- Khi module import lại nhiều lần trong test, có `ResourceWarning: unclosed file`.
- Trên sandbox Windows, việc ghi `src/logs/app.log` bị chặn quyền, làm test fail trong sandbox; chạy ngoài sandbox thì test OK.

Gợi ý sửa:
- Đưa việc tạo `FileHandler` và `StreamHandler` vào trong block `if not logger.handlers:`.
- Set `encoding="utf-8"` cho `FileHandler`.
- Có thể cho phép override log dir bằng env var, vì test/sandbox/CI thường không muốn ghi vào source tree.

### Low - Docker Compose chưa thật sự reproducible cho demo/nộp bài

File liên quan:
- `docker-compose.yml`
- `backend/Dockerfile`

Nhận xét:
- Một số image đang dùng `latest`: `qdrant/qdrant:latest`, `milvusdb/milvus:latest`, `ollama/ollama:latest`, `curlimages/curl:latest`.
- Backend trong compose chạy `uvicorn ... --reload`, phù hợp dev nhưng không ổn định bằng production/demo submission.

Gợi ý sửa:
- Pin version cụ thể cho tất cả image quan trọng.
- Bỏ `--reload` trong cấu hình compose dùng để nộp/demo.
- Nếu vẫn muốn dev mode, tách `docker-compose.override.yml` riêng.

### Low - Frontend audit có 2 moderate dev-only vulnerabilities

File liên quan:
- `frontend/package.json`
- `frontend/package-lock.json`

Nhận xét:
- `npm audit` đầy đủ báo 2 moderate vulnerabilities liên quan `vite` và `esbuild`.
- `npm audit --omit=dev` báo 0 production vulnerabilities.
- Rủi ro này chủ yếu ảnh hưởng dev server, không ảnh hưởng build production nginx trong Docker.

Gợi ý sửa:
- Nếu có thời gian, update Vite lên major mới và test lại build.
- Nếu không, có thể ghi chú đây là dev-only risk và production audit sạch.

## Những Gì Đã Kiểm Tra

### Git/worktree

Lệnh:
```bash
git status --short
```

Kết quả:
- Working tree sạch, không có thay đổi chưa commit tại thời điểm review.

### File và cấu trúc repo

Lệnh/chức năng đã dùng:
```bash
rg --files
Get-ChildItem -Force
git ls-files
git ls-files -s backend/core backend/config.py
git show HEAD:backend/core
git show HEAD:backend/config.py
```

Kết quả:
- Xác định repo có các phần chính: `backend/`, `frontend/`, `src/`, `docs/`, `data/`, `docker-compose.yml`.
- Xác nhận `backend/core` và `backend/config.py` là symlink được track trong Git.

### README và encoding

Lệnh:
```powershell
Get-Content README.md
Get-Content -Encoding UTF8 README.md
```

Kết quả:
- File README là UTF-8 và đọc đúng khi chỉ định encoding.
- Lần đọc đầu bằng PowerShell mặc định hiện chữ lỗi do encoding console, không kết luận là file hỏng.

### Docker Compose

Lệnh:
```bash
docker compose config
```

Kết quả:
- Compose parse OK.
- Có warning từ Docker CLI: không đọc được `C:\Users\ADMIN\.docker\config.json` do Access denied. Warning này không phải lỗi config compose.
- Chưa chạy full `docker compose up` vì sẽ kéo image/model nặng và tốn tài nguyên.

### Backend import và test

Lệnh đã thử:
```powershell
.\.venv\Scripts\python.exe -c "import backend.app.main; print('backend import ok')"
.\.venv\Scripts\python.exe -m pytest --collect-only -q
$env:PYTHONPATH='backend;src'; .\.venv\Scripts\python.exe -m unittest discover backend\tests
```

Kết quả:
- Import backend trực tiếp không set đúng `PYTHONPATH` fail với `ModuleNotFoundError: No module named 'app'`. Điều này phù hợp với cách compose đang set `PYTHONPATH=/app:/app/backend`.
- `pytest` không có trong `.venv`, nên không chạy được pytest.
- Chạy `unittest discover backend\tests` trong sandbox fail vì sandbox không cho ghi `src/logs/app.log`.
- Chạy lại unittest ngoài sandbox với `PYTHONPATH='backend;src'`: 7 tests OK.
- Có `ResourceWarning: unclosed file` từ logger.

### Frontend install/build

Lệnh:
```bash
npm ci
npm run build
```

Kết quả:
- `npm ci` OK sau khi chạy ngoài sandbox.
- `npm run build` OK.
- Vite build có warning chunk `three` lớn hơn 500 kB sau minification. Đây là warning hiệu năng/code splitting, không phải lỗi build.

### Frontend security audit

Lệnh:
```bash
npm audit --json
npm audit --omit=dev --json
```

Kết quả:
- Full audit: 2 moderate vulnerabilities liên quan `vite` và `esbuild`.
- Production audit với `--omit=dev`: 0 vulnerabilities.

### Frontend utility test

Lệnh:
```bash
node frontend/src/utils/benchmarkInsights.test.mjs
```

Kết quả:
- Test JS utility chạy OK.

### Search lỗi/comment đang ngồi

Lệnh:
```bash
rg -n "TODO|FIXME|HACK|XXX|pass$|NotImplemented|mock|MOCK|localhost|127\.0\.0\.1|latest|any"
```

Kết quả:
- Không thấy TODO/FIXME/HACK nổi bật cần xử lý trước khi nộp.

## Mục Nên Sửa Trước Khi Nộp

Ưu tiên nhanh:
1. Sửa `.env.example` về `qwen2.5:1.5b`.
2. Đổi `/health` để hiện rõ DB nào fail thay vì luôn `status: ok`.
3. Sửa logger để hết `ResourceWarning`.

Ưu tiên nếu còn thời gian:
1. Thêm healthcheck/retry cho Docker Compose.
2. Thống nhất import Python và loại bỏ phụ thuộc symlink.
3. Pin Docker image versions.
4. Cân nhắc update Vite/esbuild nếu muốn audit full sạch.

