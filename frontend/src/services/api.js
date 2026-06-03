import axios from 'axios'

const http = axios.create({ baseURL: '/api/v1', timeout: 300_000 })
const INGEST_TIMEOUT_MS = 900_000

http.interceptors.response.use(
  (r) => r.data,
  (e) => Promise.reject(new Error(e.response?.data?.detail ?? e.message)),
)

const parseCSV = (text) => {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/)
  if (!headerLine) return []
  const headers = headerLine.split(',').map((h) => h.trim())

  return lines.filter(Boolean).map((line) => {
    const values = line.split(',')
    return Object.fromEntries(headers.map((header, idx) => {
      const raw = values[idx]?.trim() ?? ''
      const value = raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : raw
      return [header, value]
    }))
  })
}

const readCSV = async (path) => {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Failed to load ${path}`)
  return parseCSV(await response.text())
}

const normalizeRecall = (rows, columns) =>
  rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => {
    if (columns.includes(key) && typeof value === 'number' && value > 1) {
      return [key, value / 100]
    }
    return [key, value]
  })))

export const api = {
  // Health
  getHealth: () => http.get('/health'),

  // Metrics (latency CSV data)
  getMetrics: () => http.get('/metrics').catch(() => readCSV('/benchmark-data/combined/metrics.csv')),
  clearMetrics: () => http.delete('/metrics'),

  // Ingestion
  ingestDocument: (file, db) => {
    const form = new FormData()
    form.append('file', file)
    form.append('db', db)
    return http.post('/ingest', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: INGEST_TIMEOUT_MS,
    })
  },
  ingestDocumentAll: (file) => {
    const form = new FormData()
    form.append('file', file)
    return http.post('/ingest/all', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: INGEST_TIMEOUT_MS,
    })
  },
  resetAllDocuments: () => http.delete('/ingest/all'),

  // Benchmark
  getLatestAccuracyBenchmark: () =>
    http.get('/benchmark/accuracy/latest').catch(async () =>
      normalizeRecall(await readCSV('/benchmark-data/combined/recall.csv'), ['Recall@1', 'Recall@5', 'Recall@10'])
    ),
  getLatestTradeoffSweep: () =>
    http.get('/benchmark/tradeoff/latest').catch(async () =>
      normalizeRecall(await readCSV('/benchmark-data/combined/tradeoff.csv'), ['Recall'])
    ),

  getBenchmarkSetup: () => http.get('/benchmark/setup'),

  startFullBenchmark: (config = {}) =>
    http.post('/benchmark/full', {
      corpus_size: config.corpusSize ?? 10_000,
      num_queries: config.numQueries ?? 200,
      reset_collections: config.resetCollections ?? true,
      run_accuracy: config.runAccuracy ?? true,
      run_tradeoff: config.runTradeoff ?? true,
    }),

  getBenchmarkJob: (jobId) => http.get(`/benchmark/jobs/${jobId}`),
  getLatestBenchmarkJob: () => http.get('/benchmark/jobs/latest'),

  runStressTest: (rounds, chunksPerRound) =>
    http.post('/benchmark/stress', { rounds, chunks_per_round: chunksPerRound }),

  runAccuracyBenchmark: (corpusSize, numQueries, ingest) =>
    http.post('/benchmark/accuracy', { corpus_size: corpusSize, num_queries: numQueries, ingest }),

  runTradeoffSweep: (ingest) =>
    http.post('/benchmark/tradeoff', { ingest }),

  runHybridBenchmark: (query, filters, topK, alpha) =>
    http.post('/benchmark/hybrid', { query, filters, top_k: topK, alpha }),

  getBenchmarkReport: () => http.get('/benchmark/report'),

  // RAG Chat
  chat: (query, db, topK = 5) => http.post('/chat', { query, db, top_k: topK }),
  compareChat: (query, topK = 5) => http.post('/chat/compare', { query, top_k: topK }),

  // Resources
  getResources: () => http.get('/resources'),
}
