import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { LatencyBarChart } from '../components/charts/LatencyChart'
import MetricCard from '../components/ui/MetricCard'
import { api } from '../services/api'

export default function LatencyPage() {
  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['metrics'], queryFn: api.getMetrics, refetchInterval: 15_000,
  })
  const { data: resources } = useQuery({ queryKey: ['resources'], queryFn: api.getResources, refetchInterval: 10_000 })

  const ops = ['insert', 'search']
  const chartData = ops.map((op) => {
    const row = { operation: op }
    for (const db of ['Qdrant', 'Weaviate', 'Milvus']) {
      const rows = raw.filter((r) => r.Engine === db && r.Operation === op)
      row[db] = rows.length ? rows.reduce((s, r) => s + r.Duration_ms, 0) / rows.length : 0
    }
    return row
  })

  const p95 = (db, op) => {
    const rows = raw.filter((r) => r.Engine === db && r.Operation === op).map((r) => r.Duration_ms).sort((a, b) => a - b)
    if (!rows.length) return '—'
    return rows[Math.floor(rows.length * 0.95)]?.toFixed(1) ?? '—'
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {['Qdrant', 'Weaviate', 'Milvus'].map((db) => (
          <MetricCard
            key={db}
            label={`${db} — Search p95`}
            value={p95(db, 'search')}
            unit="ms"
            color={db.toLowerCase()}
          />
        ))}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Average Operational Latency</h3>
        {isLoading ? (
          <div className="h-[280px] skeleton" />
        ) : (
          <LatencyBarChart data={chartData} />
        )}
      </div>

      {resources?.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Container Resources</h3>
          <div className="grid grid-cols-3 gap-4">
            {resources.map((r) => (
              <div key={r.engine} className="space-y-2">
                <p className="text-xs text-gray-400 font-semibold">{r.engine}</p>
                <p className="font-mono text-sm text-white">{r.cpu_percent?.toFixed(1)}% CPU</p>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-primary rounded-full"
                    style={{ width: `${Math.min((r.mem_usage_mb / r.mem_limit_mb) * 100, 100)}%` }}
                  />
                </div>
                <p className="font-mono text-xs text-gray-400">{r.mem_usage_mb?.toFixed(0)} / {r.mem_limit_mb?.toFixed(0)} MB</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
