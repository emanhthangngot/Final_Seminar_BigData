import axios from 'axios'

const http = axios.create({ baseURL: '/api/v1', timeout: 120_000 })

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
    return http.post('/ingest', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },

  // Benchmark
  getLatestAccuracyBenchmark: () =>
    http.get('/benchmark/accuracy/latest').catch(async () =>
      normalizeRecall(await readCSV('/benchmark-data/combined/recall.csv'), ['Recall@1', 'Recall@5', 'Recall@10'])
    ),
  getLatestTradeoffSweep: () =>
    http.get('/benchmark/tradeoff/latest').catch(async () =>
      normalizeRecall(await readCSV('/benchmark-data/combined/tradeoff.csv'), ['Recall'])
    ),

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
