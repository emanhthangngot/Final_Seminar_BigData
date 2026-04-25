# Kế Hoạch Cá Nhân - Thành Viên A (Lê Xuân Trí)
**Vai trò:** RAG Architect & Full-Stack Lead
**Kỹ năng chính:** React 18, Three.js, FastAPI, LangChain, Python

## 1. Mục tiêu công việc
Chịu trách nhiệm kiến trúc toàn bộ hệ thống Full-Stack: frontend React + Three.js tại `frontend/`, backend FastAPI MVC tại `backend/`, pipeline xử lý tài liệu PDF tại `src/core/`, và tổng hợp Dashboard benchmark giữa 3 hệ quản trị Qdrant, Weaviate, Milvus. Đảm bảo toàn bộ hệ thống tích hợp chạy mượt mà theo cấu trúc Master Plan.

## 2. Phân công chi tiết (Detailed Timeline)

### Tuần 1: Thiết lập Hệ thống Core RAG + Project Scaffold

**Backend (FastAPI):**
- Khởi tạo cấu trúc `backend/` theo MVC: `controllers/`, `services/`, `routers/`, `models/`.
- Viết `backend/app/main.py` với lifespan hook kết nối DB + CORS cho `localhost:5173`.
- Symlink `backend/core → src/core` và `backend/config.py → src/config.py` để tái sử dụng Python core.
- Thiết lập `backend/app/services/database_service.py` (singleton DB catalog).

**Core Python:**
- Lập trình `src/core/data_ingestion/processor.py` sử dụng LangChain PDF chunking.
- Tích hợp Ollama API Local (`nomic-embed-text`, `qwen2.5:3b`) qua `src/core/data_ingestion/embedder.py`.
- Thiết lập cơ chế `MOCK_MODE` tại `src/core/data_ingestion/generator.py`.

**Frontend (React + Vite):**
- Khởi tạo `frontend/` với Vite + React 18 + Tailwind CSS + TypeScript (optional).
- Cài đặt dependencies: `@react-three/fiber`, `@react-three/drei`, `three`, `recharts`, `zustand`, `framer-motion`.
- Cấu hình `vite.config.js` với proxy `/api → http://localhost:8000`.

### Tuần 2: Dashboard React + FastAPI API Endpoints

**Frontend — 7 Pages:**
- `/dashboard` — Hero 3D VectorSpaceScene + DB status + latency summary cards.
- `/latency` — LatencyBarChart (Recharts), Resource monitor (CPU/RAM bars).
- `/accuracy` — RecallBarChart + MRRRadarChart + leaderboard table.
- `/tradeoff` — TradeoffCurve (ScatterChart) Recall vs Latency Pareto.
- `/hybrid` — Hybrid Search comparison cards (B/C/D implement, A wires UI).
- `/dx-score` — DX Radar chart + per-DB metric table.
- `/rag-chat` — Chat interface + UploadPanel (PDF drag-drop) + DB selector.

**Three.js Components:**
- `VectorSpaceScene.jsx` — 3 rotating vector clouds (one per DB), colored differently, orbital controls.
- `PerformanceGlobe.jsx` — Radar ring rings per DB colored by DB color, rotates based on performance.

**Backend API (FastAPI Routers):**
- `GET /api/v1/health` — DB connection status per engine.
- `POST /api/v1/ingest` — multipart/form-data PDF upload → chunk → embed → insert.
- `POST /api/v1/chat` — query + db → search → generate → ChatResponse with latency.
- `POST /api/v1/benchmark/accuracy` — run_accuracy_benchmark → list[AccuracyResult].
- `POST /api/v1/benchmark/tradeoff` — run_tradeoff_sweep → list[TradeoffResult].
- `POST /api/v1/benchmark/stress` — run_stress_test → dict stats.
- `GET /api/v1/metrics` — serve `metrics.csv` as JSON.
- `GET /api/v1/resources` — Docker container CPU/RAM stats.
- `GET /api/v1/dx` — run dx_analyzer → dict scores.

**Fairness Protocol:**
- Định nghĩa `INDEX_PARAMS` (HNSW M=16, ef_construction=128, ef_search=64, COSINE) trong `src/config.py`.
- Review PR của B/C/D để đảm bảo họ consume constants này.
- Module `src/core/benchmark/dataset.py`: synthetic corpus 10K chunks với nhãn `[CID:NNNNNNN]`.
- Module `src/core/benchmark/evaluator.py`: Recall@1/5/10 + MRR với ground-truth là Chunk ID exact match.

### Tuần 3: 3D Visualization Nâng Cao + Benchmark Sweep

**Three.js Advanced:**
- Cải thiện `VectorSpaceScene` với edge drawing giữa nearest neighbor vectors.
- `PerformanceGlobe` hiển thị ring radius tỉ lệ với Recall@5 của từng DB theo real-time data.
- Tối ưu performance: dispose geometry khi unmount, dùng `useFrame` thay vì re-render.

**Benchmark Modules:**
- `src/core/benchmark/tradeoff.py`: sweep `top_k ∈ {1,2,5,10,20,50}` cho cả 3 DB.
- Nâng cấp `src/core/utils/dx_analyzer.py`: cyclomatic complexity + count public methods + count third-party imports.
- Dashboard React render mượt với corpus 10K+ (lazy load, React Query staleTime).

**Integration:**
- Hỗ trợ B/C/D debug khi Recall của họ bất thường.
- Kiểm tra CORS, error boundaries, loading states cho tất cả API calls.

### Tuần 4: Đóng gói, Slide & Thuyết Trình

- Thiết kế Slide thuyết trình, đảm bảo trade-offs 4 trụ cột (screenshot từ React dashboard).
- Phối hợp thành viên thiết kế Architecture Diagram cho báo cáo.
- Định hình Demo Video: show React dashboard live → 3D scene → accuracy benchmark → chat.
- Viết `README.md` hướng dẫn `docker compose up` là chạy được toàn bộ.

## 3. Chỉ số Kỹ thuật Cần Đạt (KPIs)

| Module | KPI |
| :--- | :--- |
| `VectorSpaceScene.jsx` | 60fps tại corpus 3 × 200 points, OrbitControls mượt |
| `backend/app/main.py` | API response overhead < 200ms, CORS hoạt động với `localhost:5173` |
| `evaluator.py` | Tính đúng Recall@1/5/10 + MRR bằng exact chunk-ID match trên corpus ≥ 10K |
| `tradeoff.py` | Sinh được DataFrame (Engine, top_k, Recall, AvgLatency_ms) → curve Recharts ScatterChart |
| FastAPI routers | Tất cả 9 endpoints trả về đúng Pydantic schema, status codes 200/422/500 |
| `dx_analyzer.py` | Complexity Score gồm ≥ 4 signals (sloc, methods, cyclomatic, third_party_imports) |
| React Frontend | 7 pages load < 2s, mobile responsive 375px, no horizontal scroll |

## 4. Cấu trúc File Trách nhiệm A

```text
frontend/
├── src/
│   ├── components/three/VectorSpaceScene.jsx   ← A owns
│   ├── components/three/PerformanceGlobe.jsx   ← A owns
│   ├── components/charts/LatencyChart.jsx       ← A owns
│   ├── components/charts/RecallChart.jsx        ← A owns
│   ├── components/charts/TradeoffCurve.jsx      ← A owns
│   ├── components/ui/MetricCard.jsx             ← A owns
│   ├── components/ui/DBBadge.jsx                ← A owns
│   ├── components/ui/UploadPanel.jsx            ← A owns
│   ├── components/layout/                       ← A owns
│   ├── pages/                                   ← A owns (all pages)
│   ├── services/api.js                          ← A owns
│   └── store/benchmarkStore.js                  ← A owns

backend/
├── app/
│   ├── main.py                                  ← A owns
│   ├── controllers/                             ← A owns
│   ├── services/                                ← A owns
│   ├── models/                                  ← A owns
│   └── routers/                                 ← A owns

src/core/
├── data_ingestion/processor.py                  ← A owns
├── data_ingestion/embedder.py                   ← A owns
├── data_ingestion/generator.py                  ← A owns
├── benchmark/dataset.py                         ← A owns
├── benchmark/evaluator.py                       ← A owns
└── benchmark/tradeoff.py                        ← A owns
```
