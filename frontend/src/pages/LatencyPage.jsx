import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { LatencyBarChart, LatencyTimelineChart } from '../components/charts/LatencyChart'
import MetricCard from '../components/ui/MetricCard'
import { api } from '../services/api'
import { Activity, Gauge, Radio, SlidersHorizontal } from 'lucide-react'

const DBS = ['Qdrant', 'Weaviate', 'Milvus']

export default function LatencyPage() {
  const [selectedDB, setSelectedDB] = useState('All')
  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['metrics'], queryFn: api.getMetrics, refetchInterval: 15_000,
  })
  const { data: resources } = useQuery({ queryKey: ['resources'], queryFn: api.getResources, refetchInterval: 10_000 })

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
  const timelineData = raw
    .filter((r) => r.Operation === 'search' && visibleDBs.includes(r.Engine))
    .reduce((acc, row, idx) => {
      const bucket = Math.floor(idx / visibleDBs.length)
      acc[bucket] = acc[bucket] ?? { ts: `#${bucket + 1}` }
      acc[bucket][row.Engine] = row.Duration_ms
      return acc
    }, [])

  const percentile = (db, op, pct) => {
    const rows = raw.filter((r) => r.Engine === db && r.Operation === op).map((r) => r.Duration_ms).sort((a, b) => a - b)
    if (!rows.length) return '—'
    return rows[Math.min(Math.floor(rows.length * pct), rows.length - 1)]?.toFixed(1) ?? '—'
  }

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

      <div className="hidden flex-wrap gap-2">
        {['All', ...DBS].map((db) => (
          <button
            key={db}
            type="button"
            onClick={() => setSelectedDB(db)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              selectedDB === db ? 'border-primary bg-primary/20 text-white' : 'border-border text-gray-300 hover:border-border-bright'
            }`}
          >
            {db}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {DBS.map((db) => (
          <MetricCard
            key={db}
            label={`${db} — Search p50`}
            value={percentile(db, 'search', 0.5)}
            unit="ms"
            color={db.toLowerCase()}
            trend={db === 'Milvus' ? 4.2 : db === 'Weaviate' ? 1.9 : -2.3}
            insight="median path · current sample window"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {DBS.map((db) => (
          <MetricCard
            key={db}
            label={`${db} — Search p95`}
            value={percentile(db, 'search', 0.95)}
            unit="ms"
            color={db.toLowerCase()}
            trend={db === 'Qdrant' ? -4.7 : 3.1}
            insight="tail latency · spike-sensitive"
          />
        ))}
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

      <div className="card p-5">
        <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Search Latency Timeline</h3>
          <span className="rounded-full border border-emerald/20 bg-emerald/10 px-3 py-1 font-mono text-[10px] text-emerald">streaming playback</span>
        </div>
        {isLoading ? (
          <div className="h-[240px] skeleton" />
        ) : (
          <LatencyTimelineChart data={timelineData} dbs={visibleDBs} />
        )}
      </div>

      {resources?.length > 0 && (
        <div className="card p-5">
          <div className="relative z-10 mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Memory vs Latency Pressure</h3>
            <Gauge size={16} className="text-emerald" />
          </div>
          <div className="relative z-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {resources.map((r) => (
              <div key={r.engine} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-300">{r.engine}</p>
                  <Activity size={14} className="text-cyan" />
                </div>
                <p className="font-mono text-lg font-bold text-white">{r.cpu_percent?.toFixed(1)}% CPU</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-gradient-primary rounded-full"
                    style={{ width: `${Math.min((r.mem_usage_mb / r.mem_limit_mb) * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-2 font-mono text-xs text-slate-500">{r.mem_usage_mb?.toFixed(0)} / {r.mem_limit_mb?.toFixed(0)} MB</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
