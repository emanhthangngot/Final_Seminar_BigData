import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { RecallBarChart } from '../components/charts/RecallChart'
import { useBenchmarkStore } from '../store/benchmarkStore'
import { api } from '../services/api'
import { Award, FlaskConical } from 'lucide-react'

export default function AccuracyPage() {
  const { accuracyResults, setAccuracyResults } = useBenchmarkStore()

  const { data: latestAccuracy = [] } = useQuery({
    queryKey: ['benchmark', 'accuracy', 'latest'],
    queryFn: api.getLatestAccuracyBenchmark,
    enabled: accuracyResults.length === 0,
  })

  useEffect(() => {
    if (!accuracyResults.length && latestAccuracy.length) {
      setAccuracyResults(latestAccuracy)
    }
  }, [accuracyResults.length, latestAccuracy, setAccuracyResults])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="card-glow p-6">
        <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/75">Scientific Precision</p>
            <h1 className="hero-title mt-2">Recall@K benchmark for retrieval quality.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Deterministic chunk-ID evaluation with reproducible seeds, Recall@1/5/10, MRR, latency, and error counts.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <div className="mb-4 flex items-center gap-2">
              <FlaskConical size={16} className="text-cyan" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Snapshot Mode</h3>
            </div>
            <p className="text-sm leading-6 text-slate-400">
              This page loads the latest saved benchmark snapshot automatically, so presentation results stay stable and no long evaluation run is triggered live.
            </p>
          </div>
        </div>
      </div>

      {!accuracyResults.length && (
        <div className="card p-5">
          <div className="relative z-10 flex h-[240px] items-center justify-center text-sm text-slate-400">
            Loading synced benchmark data for Recall@1/5/10, MRR, latency, and error comparisons.
          </div>
        </div>
      )}

      {accuracyResults.length > 0 && (
        <>
          <div className="card p-5">
            <div className="relative z-10 mb-4 flex items-center gap-2">
              <Award size={16} className="text-cyan" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Recall@K Leaderboard</h3>
            </div>
            <RecallBarChart data={accuracyResults} />
          </div>
          <div className="card overflow-hidden">
            <table className="relative z-10 w-full text-xs font-mono">
              <thead className="border-b border-border">
                <tr>
                  {['Engine', 'Recall@1', 'Recall@5', 'Recall@10', 'MRR', 'AvgLatency (ms)', 'Errors'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accuracyResults.map((r) => (
                  <tr key={r.Engine} className="border-b border-border/50 hover:bg-white/3">
                    <td className="px-4 py-3 font-semibold text-white">{r.Engine}</td>
                    {['Recall@1', 'Recall@5', 'Recall@10', 'MRR'].map((k) => (
                      <td key={k} className="px-4 py-3 text-gray-300">{(r[k] * 100).toFixed(1)}%</td>
                    ))}
                    <td className="px-4 py-3 text-gray-300">{r.AvgLatency_ms?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-qdrant">{r.Errors ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </motion.div>
  )
}
