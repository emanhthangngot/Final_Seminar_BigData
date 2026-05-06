import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, GitMerge, Play, Route, SearchCode } from 'lucide-react'
import DBBadge from '../components/ui/DBBadge'
import { api } from '../services/api'

const NOTES = [
  { db: 'Qdrant', impl: 'prefetch + late interaction', desc: 'Dense prefetch → sparse re-rank. payload filter composable into any stage.' },
  { db: 'Weaviate', impl: 'collection.query.hybrid(alpha=...)', desc: 'Built-in BM25 + Vector. Tune alpha 0→1 (keyword→vector). Most ergonomic hybrid API.' },
  { db: 'Milvus', impl: 'AnnSearchRequest + RRFRanker', desc: 'Explicit sparse + dense request. Ranker: RRF or WeightedRanker. More verbose but very flexible.' },
]

const DB_COLORS = { Qdrant: '#EF4444', Weaviate: '#3B82F6', Milvus: '#10B981' }

export default function HybridPage() {
  const [query, setQuery] = useState('vector database filtering benchmark')
  const [category, setCategory] = useState('')
  const [topK, setTopK] = useState(5)
  const [results, setResults] = useState([])

  const filters = category.trim() ? { category: category.trim() } : null
  const { mutate, isPending, error } = useMutation({
    mutationFn: () => api.runHybridBenchmark(query, filters, topK),
    onSuccess: setResults,
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="card-glow p-6">
        <div className="relative z-10 mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/75">Hybrid Retrieval Laboratory</p>
          <h1 className="hero-title mt-2">Dense plus sparse search, visualized as a retrieval pipeline.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Compare BM25/vector fusion, filter behavior, routing strategy, and result yield through the shared benchmark API.
          </p>
        </div>
        <div className="relative z-10 mb-6 grid grid-cols-1 gap-3 md:grid-cols-5">
          {['Query', 'Token route', 'Dense ANN', 'BM25 sparse', 'Rerank'].map((stage, idx) => (
            <div key={stage} className="flex items-center gap-3">
              <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                <Route size={15} className="mb-2 text-cyan" />
                <p className="text-xs font-semibold text-white">{stage}</p>
                <p className="mt-1 font-mono text-[10px] text-slate-500">stage {idx + 1}</p>
              </div>
              {idx < 4 && <ArrowRight size={16} className="hidden text-slate-600 md:block" />}
            </div>
          ))}
        </div>
        <div className="relative z-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {NOTES.map(({ db, impl, desc }) => (
            <div key={db} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <DBBadge name={db} size="md" />
              <code className="mt-3 block break-all rounded-xl border border-white/10 bg-white/[0.045] p-2 font-mono text-xs text-slate-400">{impl}</code>
              <p className="mt-3 text-sm leading-5 text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="relative z-10 flex items-center gap-2">
          <SearchCode size={16} className="text-cyan" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Filtering Sweep</h3>
        </div>
        <div className="relative z-10 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_120px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="premium-input"
            placeholder="Benchmark query"
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="premium-input"
            placeholder="category filter"
          />
          <input
            type="number"
            min={1}
            max={50}
            value={topK}
            onChange={(e) => setTopK(+e.target.value)}
            className="premium-input font-mono"
          />
        </div>
        <button className="btn-primary relative z-10" disabled={isPending || !query.trim()} onClick={() => mutate()}>
          <Play size={16} />
          {isPending ? 'Running...' : 'Run Hybrid Benchmark'}
        </button>
        {error && <p className="text-sm text-qdrant">{error.message}</p>}
      </div>

      <div className="card p-5">
        <h3 className="relative z-10 mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">Hybrid Result Count</h3>
        {results.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={results} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="Engine" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(12,12,20,0.95)', border: '1px solid rgba(94,106,210,0.3)', borderRadius: 8 }} />
              <Bar dataKey="ResultCount" radius={[3, 3, 0, 0]} fill="#5E6AD2">
                {results.map((row) => (
                  <Cell key={row.Engine} fill={DB_COLORS[row.Engine]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-gray-400">
            Run the benchmark to compare filtered hybrid search across engines.
          </div>
        )}
      </div>
    </motion.div>
  )
}
