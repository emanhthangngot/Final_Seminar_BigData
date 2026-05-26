import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Filter, Search } from 'lucide-react'
import DBBadge from '../components/ui/DBBadge'
import { useBenchmarkStore } from '../store/benchmarkStore'
import { api } from '../services/api'

const DB_COLORS = { Qdrant: '#EF4444', Weaviate: '#3B82F6', Milvus: '#10B981' }
const DEFAULT_TOP_K = 5
const FALLBACK_RESULTS = [
  { Engine: 'Qdrant', ResultCount: 5, Latency_ms: 4.8, Errors: 0 },
  { Engine: 'Weaviate', ResultCount: 5, Latency_ms: 14.5, Errors: 0 },
  { Engine: 'Milvus', ResultCount: 5, Latency_ms: 10.7, Errors: 0 },
]

const SETUP_ITEMS = [
  { label: 'Dataset', value: 'from RAG Chat' },
  { label: 'Mode', value: 'retrieval only' },
  { label: 'top_k', value: DEFAULT_TOP_K },
]

export default function HybridPage() {
  const { hybridSearch, setHybridQuery, setHybridData } = useBenchmarkStore()
  const { query, data: hybridData } = hybridSearch

  const { mutate: runHybrid, isPending } = useMutation({
    mutationFn: async (inputQuery) => {
      try {
        const rows = await api.runHybridBenchmark(inputQuery, null, DEFAULT_TOP_K)
        return { rows, mode: 'live' }
      } catch (error) {
        return { rows: FALLBACK_RESULTS, mode: 'fallback', error: error.message }
      }
    },
    onSuccess: setHybridData,
  })

  const results = hybridData?.rows ?? []
  const isFallback = hybridData?.mode === 'fallback'
  const rankedResults = [...results].sort((a, b) => Number(a.Latency_ms ?? 0) - Number(b.Latency_ms ?? 0))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="card-glow p-6">
        <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/75">Hybrid Search</p>
            <h1 className="hero-title mt-2">Hybrid search latency ranking.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Bước này chạy sau RAG Chat/ingest. Nhập một query để đo tốc độ retrieval trên cùng document đã được chunk, embed, và index vào cả ba database.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {SETUP_ITEMS.map((item) => (
              <div key={item.label} className="rounded-2xl border border-cyan/15 bg-cyan/5 px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan/70">{item.label}</p>
                <p className="mt-1 font-mono text-base font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="relative z-10 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setHybridQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && query.trim() && !isPending) runHybrid(query.trim())
              }}
              className="premium-input w-full py-3 pl-11"
              placeholder="Nhập query để đo retrieval latency trên 3 DB..."
            />
          </div>
          <button
            className="btn-primary py-3"
            disabled={!query.trim() || isPending}
            onClick={() => runHybrid(query.trim())}
          >
            {isPending ? 'Running...' : 'Run retrieval'}
          </button>
        </div>
      </div>

      {isFallback && (
        <div className="card p-4">
          <div className="relative z-10 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
            Backend hybrid API chưa sẵn sàng nên page đang dùng snapshot demo ổn định. Lỗi gốc: {hybridData.error}
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-cyan" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Latency ranking</h3>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 font-mono text-[10px] text-slate-400">
            {isFallback ? 'Demo Snapshot' : 'Live API'}
          </span>
        </div>

        {isPending ? (
          <div className="h-[300px] skeleton" />
        ) : rankedResults.length ? (
          <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rankedResults} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="Engine" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} unit=" ms" />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)} ms`, 'Latency']}
                  contentStyle={{ background: 'rgba(12,12,20,0.95)', border: '1px solid rgba(94,106,210,0.3)', borderRadius: 8 }}
                />
                <Bar dataKey="Latency_ms" radius={[8, 8, 0, 0]} fill="#5E6AD2">
                  {rankedResults.map((row) => (
                    <Cell key={row.Engine} fill={DB_COLORS[row.Engine]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              {rankedResults.map((row, index) => (
                <div key={row.Engine} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan/20 bg-cyan/10 font-mono text-xs font-bold text-cyan">
                        #{index + 1}
                      </span>
                      <DBBadge name={row.Engine} size="sm" />
                    </div>
                    <span className={`rounded-full px-2 py-1 font-mono text-[10px] ${row.Errors ? 'bg-qdrant/10 text-qdrant' : 'bg-emerald/10 text-emerald'}`}>
                      {row.Errors ? 'error' : 'ok'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Latency</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-white">{Number(row.Latency_ms ?? 0).toFixed(1)} ms</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Result count</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-white">{row.ResultCount ?? 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
            Ingest a PDF in RAG Chat, enter a query, then run retrieval to compare the three databases.
          </div>
        )}
      </div>

    </motion.div>
  )
}
