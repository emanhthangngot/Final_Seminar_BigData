import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { LatencyBarChart } from '../components/charts/LatencyChart'
import { api } from '../services/api'
import { Activity, Radio, SlidersHorizontal } from 'lucide-react'

const DBS = ['Qdrant', 'Weaviate', 'Milvus']
const DB_META = {
  Qdrant: { color: 'text-qdrant', border: 'border-qdrant/25', bg: 'bg-qdrant/10', dot: 'bg-qdrant' },
  Weaviate: { color: 'text-weaviate', border: 'border-weaviate/25', bg: 'bg-weaviate/10', dot: 'bg-weaviate' },
  Milvus: { color: 'text-milvus', border: 'border-milvus/25', bg: 'bg-milvus/10', dot: 'bg-milvus' },
}

export default function LatencyPage() {
  const [selectedDB, setSelectedDB] = useState('All')
  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['metrics'], queryFn: api.getMetrics, refetchInterval: 15_000,
  })

  const ops = ['insert', 'search']
  const chartData = ops.map((op) => {
    const row = { operation: op }
    for (const db of DBS) {
      const rows = raw.filter((r) => r.Engine === db && r.Operation === op)
      row[db] = rows.length ? rows.reduce((s, r) => s + r.Duration_ms, 0) / rows.length : 0
    }
    return row
  })

  const visibleDBs = selectedDB === 'All' ? DBS : [selectedDB]
  const insertData = chartData.filter((row) => row.operation === 'insert')
  const searchData = chartData.filter((row) => row.operation === 'search')

  const percentile = (db, op, pct) => {
    const rows = raw.filter((r) => r.Engine === db && r.Operation === op).map((r) => r.Duration_ms).sort((a, b) => a - b)
    if (!rows.length) return '—'
    return rows[Math.min(Math.floor(rows.length * pct), rows.length - 1)]?.toFixed(1) ?? '—'
  }
  const latencyCards = visibleDBs.map((db) => ({
    db,
    p50: percentile(db, 'search', 0.5),
    p95: percentile(db, 'search', 0.95),
  }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <section className="card-glow p-6">
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/75">Observability Analytics</p>
            <h1 className="hero-title mt-2">Latency telemetry with percentile intelligence.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Streaming p50/p95 views, spike detection, throughput posture, and resource pressure across benchmark engines.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['All', ...DBS].map((db) => (
              <button
                key={db}
                type="button"
                onClick={() => setSelectedDB(db)}
                className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition-all ${
                  selectedDB === db ? 'border-cyan bg-cyan/15 text-white shadow-glow' : 'border-border bg-white/[0.045] text-slate-400 hover:border-border-bright hover:text-white'
                }`}
              >
                {db}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className={`grid grid-cols-1 gap-4 ${selectedDB === 'All' ? 'md:grid-cols-3' : 'xl:grid-cols-[minmax(0,1fr)_360px]'}`}>
        {latencyCards.map(({ db, p50, p95 }) => {
          const meta = DB_META[db]
          return (
            <motion.div
              key={db}
              layout
              whileHover={{ y: -3 }}
              className={`card p-5 ${selectedDB !== 'All' ? 'xl:col-span-1' : ''}`}
            >
              <div className="relative z-10">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="metric-label">Search latency profile</p>
                    <h3 className={`mt-1 text-xl font-bold ${meta.color}`}>{db}</h3>
                  </div>
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${meta.border} ${meta.bg}`}>
                    <Activity size={18} className={meta.color} />
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-2xl border ${meta.border} bg-white/[0.035] p-4`}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">p50 median</p>
                    <div className="mt-3 flex items-end gap-1">
                      <span className={`font-mono text-4xl font-bold ${meta.color}`}>{p50}</span>
                      <span className="mb-1 font-mono text-sm text-slate-500">ms</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">Typical user-facing search path.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">p95 tail</p>
                    <div className="mt-3 flex items-end gap-1">
                      <span className="font-mono text-4xl font-bold text-white">{p95}</span>
                      <span className="mb-1 font-mono text-sm text-slate-500">ms</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">Slow-path stability check.</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${meta.dot}`} style={{ width: p50 === '—' ? '0%' : `${Math.min(100, 100 - Number(p50))}%` }} />
                </div>
              </div>
            </motion.div>
          )
        })}
        {selectedDB !== 'All' && (
          <div className="card p-5">
            <div className="relative z-10">
              <p className="metric-label">Selected view</p>
              <h3 className="mt-2 text-xl font-bold text-white">Focused database mode</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Only {selectedDB} is shown in the p50/p95 cards and charts. Switch back to All to compare all three engines side by side.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="card p-5">
          <div className="relative z-10 mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Search Latency</h3>
            <Radio size={16} className="text-cyan" />
          </div>
          {isLoading ? (
            <div className="h-[260px] skeleton" />
          ) : (
            <LatencyBarChart data={searchData} dbs={visibleDBs} height={260} />
          )}
        </div>
        <div className="card p-5">
          <div className="relative z-10 mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Insert Latency</h3>
            <SlidersHorizontal size={16} className="text-primary" />
          </div>
          {isLoading ? (
            <div className="h-[260px] skeleton" />
          ) : (
            <LatencyBarChart data={insertData} dbs={visibleDBs} height={260} />
          )}
        </div>
      </div>
    </motion.div>
  )
}
