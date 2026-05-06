import axios from 'axios'

const http = axios.create({ baseURL: '/api/v1', timeout: 120_000 })

http.interceptors.response.use(
  (r) => r.data,
  (e) => Promise.reject(new Error(e.response?.data?.detail ?? e.message)),
)

export const api = {
  // Health
  getHealth: () => http.get('/health'),

  // Metrics (latency CSV data)
  getMetrics: () => http.get('/metrics'),
  clearMetrics: () => http.delete('/metrics'),

  // Ingestion
  ingestDocument: (file, db) => {
    const form = new FormData()
    form.append('file', file)
    form.append('db', db)
    return http.post('/ingest', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },

  // Benchmark
  runStressTest: (rounds, chunksPerRound) =>
    http.post('/benchmark/stress', { rounds, chunks_per_round: chunksPerRound }),

  runAccuracyBenchmark: (corpusSize, numQueries, ingest) =>
    http.post('/benchmark/accuracy', { corpus_size: corpusSize, num_queries: numQueries, ingest }),

  runTradeoffSweep: (ingest) =>
    http.post('/benchmark/tradeoff', { ingest }),

  runHybridBenchmark: (query, filters, topK) =>
    http.post('/benchmark/hybrid', { query, filters, top_k: topK }),

  // DX Score
  getDXScore: () => http.get('/dx'),

  // RAG Chat
  chat: (query, db) => http.post('/chat', { query, db }),

  // Resources
  getResources: () => http.get('/resources'),
}
