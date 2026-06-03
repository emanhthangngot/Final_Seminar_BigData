import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { Activity, BarChart3, BookOpen, CheckCircle2, Play, RefreshCw, Target, X } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import DBBadge from '../components/ui/DBBadge'
import { api } from '../services/api'
import { DB_DEMOS } from '../utils/databaseDemos'
import { asRatio, formatPercent } from '../utils/benchmarkInsights'

const DB_COLORS = { Qdrant: '#FB7185', Weaviate: '#22D3EE', Milvus: '#34D399' }

const PROOF_CASES = {
  Qdrant: {
    title: 'Edge case: selective payload guardrail',
    claim: 'Qdrant wins when metadata filters can reject most candidates before vector work becomes expensive.',
    scenarioTitle: 'Strict metadata boundary before retrieval',
    setup: 'The user asks a query, but the RAG layer also applies hard metadata constraints: category must be tech and page must be >= 99999. In this dataset that page range does not exist, so the correct behavior is to reject the candidate set quickly and return zero evidence.',
    winReason: 'This demonstrates Qdrant as a payload-filter-first engine. The benchmark is not asking “which DB finds the best semantic match?”; it asks “which DB can enforce a restrictive metadata guardrail with the least overhead?”',
    chartGuide: 'Read the chart as latency in milliseconds. Shorter bars are better. Result count should be 0 for all engines, so the winner is the engine that proves there is no valid evidence fastest.',
    caveat: 'This case proves Qdrant for selective metadata filtering, ACL/tenant/page/source guardrails, and “do not retrieve outside this boundary” RAG. It does not prove Qdrant has the best recall for broad, unfiltered semantic search.',
    metric: 'Latency_ms',
    metricLabel: 'Latency',
    lowerIsBetter: true,
    unit: 'ms',
    request: {
      query: 'metadata category tech page impossible range',
      filters: { category: 'tech', page: { gte: 99999 } },
      topK: 5,
      alpha: 0.5,
    },
    defaultRows: [
      { Engine: 'Qdrant', Latency_ms: 3.36, ResultCount: 0 },
      { Engine: 'Weaviate', Latency_ms: 4.74, ResultCount: 0 },
      { Engine: 'Milvus', Latency_ms: 7.60, ResultCount: 0 },
    ],
    explanation: [
      ['What we measure', 'A real query is sent with category=tech and an impossible page range. Lower latency wins; all engines should return zero results.'],
      ['Why this favors Qdrant', 'This is the payload-filter guardrail case: metadata eliminates the candidate set before broad ANN work is needed.'],
      ['What to say in demo', 'When RAG must enforce strict metadata boundaries such as tenant, ACL, page, or source, Qdrant is the cleanest win condition.'],
    ],
  },
  Weaviate: {
    title: 'Edge case: metadata-filtered hybrid query',
    claim: 'Weaviate wins this live case when query text and vector search run together under a category filter.',
    scenarioTitle: 'Technical query that needs both keyword and vector signals',
    setup: 'The query contains exact technical terms like category, vector database, payload, and filtering. The request also includes category=tech, so each engine must combine retrieval with metadata constraints and return the top 5 evidence chunks.',
    winReason: 'This case favors Weaviate because it is designed around schema objects and native hybrid retrieval. Dense vector search handles semantic similarity while BM25-style keyword matching helps exact technical terms stay visible.',
    chartGuide: 'Read the chart as latency in milliseconds for the same hybrid request. Shorter bars are better, and every engine returns 5 results, so the comparison is about speed under hybrid + filter workload.',
    caveat: 'This case proves Weaviate for technical, keyword-heavy RAG where exact terms and semantic similarity both matter. It does not prove Weaviate is always fastest for dense-only vector search.',
    metric: 'Latency_ms',
    metricLabel: 'Latency',
    lowerIsBetter: true,
    unit: 'ms',
    request: {
      query: 'category tech vector database payload filtering',
      filters: { category: 'tech' },
      topK: 5,
      alpha: 0.5,
    },
    defaultRows: [
      { Engine: 'Weaviate', Latency_ms: 43.92, ResultCount: 5 },
      { Engine: 'Qdrant', Latency_ms: 47.92, ResultCount: 5 },
      { Engine: 'Milvus', Latency_ms: 264.52, ResultCount: 5 },
    ],
    explanation: [
      ['What we measure', 'Same filtered hybrid request across all engines: query text + query vector + category=tech + top_k=5.'],
      ['Why this favors Weaviate', 'Weaviate is built around schema objects and hybrid retrieval, so this case stresses its native text+vector path.'],
      ['What to say in demo', 'For technical corpora where exact terms and semantic similarity both matter, Weaviate has the clearest hybrid story.'],
    ],
  },
  Milvus: {
    title: 'Edge case: high-recall top_k sweep',
    claim: 'Milvus wins when the objective is maximum recall at larger top_k after the collection is loaded.',
    scenarioTitle: 'High-coverage retrieval for larger answer context',
    setup: 'Instead of asking for the fastest single small lookup, this case asks each engine to retrieve more candidates with top_k=50. The metric is recall: how often the benchmark can recover the known correct chunk.',
    winReason: 'This case favors Milvus because the collection is already loaded into memory and the benchmark rewards broad retrieval coverage. Milvus returns far more of the known relevant chunks at top_k=50.',
    chartGuide: 'Read the chart as Recall@top_k=50. Taller bars are better. Latency is still shown in the table, but the primary proof is recall coverage, not the smallest millisecond number.',
    caveat: 'This case proves Milvus for high-recall retrieval and larger result sets after load cost is amortized. It does not prove Milvus is best for strict metadata guardrails or tiny one-off queries.',
    metric: 'Recall',
    metricLabel: 'Recall@top_k=50',
    lowerIsBetter: false,
    unit: '%',
    request: null,
    defaultRows: [
      { Engine: 'Milvus', Recall: 80.0, AvgLatency_ms: 4.17, top_k: 50 },
      { Engine: 'Qdrant', Recall: 27.0, AvgLatency_ms: 5.82, top_k: 50 },
      { Engine: 'Weaviate', Recall: 24.5, AvgLatency_ms: 15.66, top_k: 50 },
    ],
    explanation: [
      ['What we measure', 'Tradeoff sweep at top_k=50 from the benchmark snapshot. Higher recall wins; latency is shown as supporting evidence.'],
      ['Why this favors Milvus', 'Milvus amortizes load cost and searches a loaded HNSW collection, which is strong for larger result sets.'],
      ['What to say in demo', 'When recall coverage matters more than tiny per-query overhead, Milvus dominates this benchmark case.'],
    ],
  },
}

const DEEP_DIVE = {
  Qdrant: [
    ['Benchmark condition', 'Run a strict metadata guardrail query: category=tech and page >= 99999.'],
    ['Winning metric', 'Lowest observed latency in the edge case: 3.36 ms vs 4.74 ms and 7.60 ms.'],
    ['Interpretation', 'This is not a universal win. It is a selective-filter RAG case where Qdrant proves its payload filtering advantage.'],
  ],
  Weaviate: [
    ['Benchmark condition', 'Run a category-filtered hybrid query with both text and vector signals enabled.'],
    ['Winning metric', 'Lowest observed latency in the filtered hybrid edge case: 43.92 ms vs 47.92 ms and 264.52 ms.'],
    ['Interpretation', 'This supports Weaviate when the workload needs schema-aware hybrid retrieval, not plain dense-only recall.'],
  ],
  Milvus: [
    ['Benchmark condition', 'Use the top_k tradeoff sweep and compare recall at top_k=50.'],
    ['Winning metric', 'Highest recall: 80.0% vs 27.0% and 24.5%, with 4.17 ms average latency in the snapshot.'],
    ['Interpretation', 'This supports Milvus for high-recall retrieval after collection load cost has been amortized.'],
  ],
}

function formatMetric(value, proof) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'n/a'
  if (proof.unit === '%') return `${numeric.toFixed(1)}%`
  return `${numeric.toFixed(2)} ${proof.unit}`
}

function winnerFromRows(rows, proof) {
  const valid = rows.filter((row) => Number.isFinite(Number(row[proof.metric])))
  if (!valid.length) return null
  return [...valid].sort((a, b) => {
    const av = Number(a[proof.metric])
    const bv = Number(b[proof.metric])
    return proof.lowerIsBetter ? av - bv : bv - av
  })[0]
}

function normalizeLiveRows(rows = []) {
  return rows.map((row) => ({
    Engine: row.Engine,
    Latency_ms: Number(row.Latency_ms),
    ResultCount: Number(row.ResultCount ?? 0),
    Errors: Number(row.Errors ?? 0),
  }))
}

function proofRowsForMilvus(tradeoff = [], fallback) {
  const rows = tradeoff
    .filter((row) => Number(row.top_k) === 50)
    .map((row) => ({
      Engine: row.Engine,
      Recall: asRatio(row.Recall) * 100,
      AvgLatency_ms: Number(row.AvgLatency_ms),
      top_k: Number(row.top_k),
    }))
  return rows.length ? rows : fallback
}

function CustomTooltip({ active, payload, proof }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-2xl border border-cyan/20 bg-[#0b1024]/95 px-3 py-2 text-xs shadow-glow backdrop-blur-xl">
      <p className="font-semibold" style={{ color: DB_COLORS[row.Engine] }}>{row.Engine}</p>
      <p className="mt-1 text-slate-300">{proof.metricLabel}: <span className="font-mono font-bold">{formatMetric(row[proof.metric], proof)}</span></p>
      {Number.isFinite(row.AvgLatency_ms) && <p className="text-slate-400">Latency: {Number(row.AvgLatency_ms).toFixed(2)} ms</p>}
      {Number.isFinite(row.ResultCount) && <p className="text-slate-400">Results: {row.ResultCount}</p>}
    </div>
  )
}

function ProofChart({ rows, proof, db }) {
  const chartRows = [...rows].sort((a, b) => proof.lowerIsBetter
    ? Number(a[proof.metric]) - Number(b[proof.metric])
    : Number(b[proof.metric]) - Number(a[proof.metric]))
  const winner = winnerFromRows(rows, proof)

  return (
    <ResponsiveContainer width="100%" height={330}>
      <BarChart data={chartRows} layout="vertical" margin={{ top: 12, right: 34, left: 12, bottom: 8 }}>
        <CartesianGrid strokeDasharray="2 10" stroke="rgba(148,163,255,0.08)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#94A3B8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => proof.unit === '%' ? `${value}%` : `${value}ms`}
        />
        <YAxis dataKey="Engine" type="category" tick={{ fill: '#CBD5E1', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
        <Tooltip content={<CustomTooltip proof={proof} />} />
        <Bar dataKey={proof.metric} radius={[0, 10, 10, 0]} maxBarSize={36}>
          {chartRows.map((row) => (
            <Cell key={row.Engine} fill={DB_COLORS[row.Engine]} fillOpacity={row.Engine === db ? 1 : 0.42} />
          ))}
          <LabelList
            dataKey={proof.metric}
            position="right"
            formatter={(value) => formatMetric(value, proof)}
            fill="#E2E8F0"
            fontSize={11}
          />
        </Bar>
        {winner?.Engine === db && <text x="62%" y={24} fill={DB_COLORS[db]} fontSize="12" fontWeight="700">winner in this case</text>}
      </BarChart>
    </ResponsiveContainer>
  )
}

function DeepDiveDrawer({ db, open, onClose }) {
  const rows = DEEP_DIVE[db] ?? []
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#070b1c]/95 p-6 shadow-deep-card"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <DBBadge name={db} />
                <h2 className="mt-3 text-2xl font-bold text-white">Proof case details</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Điều kiện benchmark được chọn để chứng minh điểm mạnh cụ thể của database này.
                </p>
              </div>
              <button type="button" onClick={onClose} className="btn-ghost px-3 py-2" aria-label="Close deep dive">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {rows.map(([title, body], index) => (
                <motion.div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan/20 bg-cyan/10 font-mono text-[10px] text-cyan">
                      {index + 1}
                    </span>
                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                  </div>
                  <p className="text-sm leading-6 text-slate-400">{body}</p>
                </motion.div>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export default function DatabaseDemoPage() {
  const { db } = useParams()
  const demo = DB_DEMOS[db]
  const [deepDiveOpen, setDeepDiveOpen] = useState(false)
  const [liveRows, setLiveRows] = useState(null)

  const { data: tradeoff = [] } = useQuery({
    queryKey: ['benchmark', 'tradeoff', 'latest'],
    queryFn: api.getLatestTradeoffSweep,
  })

  const runProof = useMutation({
    mutationFn: (proof) => api.runHybridBenchmark(
      proof.request.query,
      proof.request.filters,
      proof.request.topK,
      proof.request.alpha,
    ),
    onSuccess: (rows) => setLiveRows(normalizeLiveRows(rows)),
  })

  const proof = demo ? PROOF_CASES[demo.name] : null
  const rows = useMemo(() => {
    if (!demo || !proof) return []
    if (demo.name === 'Milvus') return proofRowsForMilvus(tradeoff, proof.defaultRows)
    return liveRows ?? proof.defaultRows
  }, [demo, liveRows, proof, tradeoff])

  if (!demo || !proof) return <Navigate to="/dashboard" replace />

  const winner = winnerFromRows(rows, proof)
  const isTargetWinner = winner?.Engine === demo.name
  const targetRow = rows.find((row) => row.Engine === demo.name)
  const second = [...rows]
    .filter((row) => row.Engine !== demo.name && Number.isFinite(Number(row[proof.metric])))
    .sort((a, b) => proof.lowerIsBetter ? Number(a[proof.metric]) - Number(b[proof.metric]) : Number(b[proof.metric]) - Number(a[proof.metric]))[0]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <section className="card-glow p-6">
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <DBBadge name={demo.name} />
              <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan">evidence demo</span>
            </div>
            <h1 className="hero-title max-w-4xl">{proof.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{proof.claim}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {proof.request && (
              <button
                type="button"
                className="btn-primary py-3"
                disabled={runProof.isPending}
                onClick={() => runProof.mutate(proof)}
              >
                {runProof.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                {runProof.isPending ? 'Running proof...' : 'Run live proof'}
              </button>
            )}
            <button type="button" className="btn-secondary py-3" onClick={() => setDeepDiveOpen(true)}>
              <BookOpen size={16} />
              Proof details
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
        <div className="card p-5">
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2 text-cyan">
              <Target size={16} />
              <p className="font-mono text-[10px] uppercase tracking-[0.22em]">case setup</p>
            </div>
            <h2 className="text-lg font-bold text-white">{proof.scenarioTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{proof.setup}</p>
          </div>
        </div>

        <div className="card p-5">
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2 text-cyan">
              <CheckCircle2 size={16} />
              <p className="font-mono text-[10px] uppercase tracking-[0.22em]">why this db wins</p>
            </div>
            <p className="text-sm leading-6 text-slate-300">{proof.winReason}</p>
            <p className="mt-3 rounded-xl border border-cyan/15 bg-cyan/5 p-3 text-xs leading-5 text-cyan">
              {proof.chartGuide}
            </p>
          </div>
        </div>

        <div className="card p-5">
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2 text-cyan">
              <Activity size={16} />
              <p className="font-mono text-[10px] uppercase tracking-[0.22em]">scope of proof</p>
            </div>
            <p className="text-sm leading-6 text-slate-300">{proof.caveat}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_380px]">
        <div className="card p-5">
          <div className="relative z-10">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-cyan">
                  <BarChart3 size={17} />
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em]">measured comparison</p>
                </div>
                <h2 className="text-xl font-bold text-white">{proof.metricLabel}: {proof.lowerIsBetter ? 'lower is better' : 'higher is better'}</h2>
              </div>
              <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${isTargetWinner ? 'border-emerald/30 bg-emerald/10 text-emerald' : 'border-amber-300/30 bg-amber-300/10 text-amber-200'}`}>
                {isTargetWinner ? `${demo.name} wins this case` : `${winner?.Engine ?? 'No engine'} wins current data`}
              </span>
            </div>
            <ProofChart rows={rows} proof={proof} db={demo.name} />
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-2 text-cyan">
                <Target size={17} />
                <h2 className="text-lg font-bold text-white">Win condition</h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="font-mono text-3xl font-bold" style={{ color: DB_COLORS[demo.name] }}>
                  {formatMetric(targetRow?.[proof.metric], proof)}
                </p>
                <p className="mt-1 text-sm text-slate-400">{demo.name} measured {proof.metricLabel}</p>
              </div>
              {second && (
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  Closest competitor: <span className="font-semibold text-white">{second.Engine}</span> at{' '}
                  <span className="font-mono text-white">{formatMetric(second[proof.metric], proof)}</span>.
                </p>
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-2 text-cyan">
                <Activity size={17} />
                <h2 className="text-lg font-bold text-white">Benchmark input</h2>
              </div>
              {proof.request ? (
                <div className="space-y-3 text-sm text-slate-400">
                  <p className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-slate-300">{proof.setup}</p>
                  <p><span className="text-slate-500">Query:</span> {proof.request.query}</p>
                  <p><span className="text-slate-500">Filters:</span> {proof.request.filters ? JSON.stringify(proof.request.filters) : 'none'}</p>
                  <p><span className="text-slate-500">top_k:</span> {proof.request.topK} · <span className="text-slate-500">alpha:</span> {proof.request.alpha}</p>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-slate-400">
                  <p className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-slate-300">{proof.setup}</p>
                  <p><span className="text-slate-500">Dataset:</span> latest tradeoff sweep snapshot</p>
                  <p><span className="text-slate-500">Scenario:</span> compare all engines at top_k=50</p>
                  <p><span className="text-slate-500">Primary metric:</span> Recall, with latency shown as support</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {proof.explanation.map(([label, value], index) => (
          <motion.div
            key={label}
            className="card p-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <div className="relative z-10">
              <div className="mb-3 flex items-center gap-2 text-cyan">
                <CheckCircle2 size={16} />
                <p className="font-mono text-[10px] uppercase tracking-[0.22em]">{label}</p>
              </div>
              <p className="text-sm leading-6 text-slate-300">{value}</p>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="card p-5">
        <div className="relative z-10 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.035] text-slate-500">
              <tr>
                <th className="px-3 py-2">Engine</th>
                <th className="px-3 py-2">{proof.metricLabel}</th>
                <th className="px-3 py-2">Latency support</th>
                <th className="px-3 py-2">Result count / top_k</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.Engine} className="border-b border-white/5 last:border-b-0">
                  <td className="px-3 py-2 font-semibold text-white">{row.Engine}</td>
                  <td className="px-3 py-2 font-mono text-slate-300">{formatMetric(row[proof.metric], proof)}</td>
                  <td className="px-3 py-2 text-slate-300">{Number.isFinite(row.AvgLatency_ms) ? `${Number(row.AvgLatency_ms).toFixed(2)} ms` : proof.metric === 'Latency_ms' ? `${Number(row.Latency_ms).toFixed(2)} ms` : 'n/a'}</td>
                  <td className="px-3 py-2 text-slate-300">{row.ResultCount ?? row.top_k ?? 'n/a'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {runProof.error && (
        <div className="rounded-2xl border border-qdrant/30 bg-qdrant/10 p-4 text-sm text-qdrant">
          Live proof failed: {runProof.error.message}
        </div>
      )}

      <DeepDiveDrawer db={demo.name} open={deepDiveOpen} onClose={() => setDeepDiveOpen(false)} />
    </motion.div>
  )
}
