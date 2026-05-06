import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { RecallBarChart, MRRRadarChart } from '../components/charts/RecallChart'
import { useBenchmarkStore } from '../store/benchmarkStore'
import { api } from '../services/api'
import { Award, FlaskConical, Medal, Play, ShieldCheck } from 'lucide-react'

export default function AccuracyPage() {
  const { accuracyResults, setAccuracyResults } = useBenchmarkStore()
  const [corpusSize, setCorpusSize] = useState(1000)
  const [numQueries, setNumQueries] = useState(50)
  const [ingest, setIngest] = useState(true)

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.runAccuracyBenchmark(corpusSize, numQueries, ingest),
    onSuccess: setAccuracyResults,
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="card-glow p-6">
        <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/75">Scientific Precision</p>
            <h1 className="hero-title mt-2">Accuracy leaderboard with confidence telemetry.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Deterministic chunk-ID evaluation with reproducible seeds, animated rankings, confidence indicators, and benchmark badges.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <div className="mb-4 flex items-center gap-2">
              <FlaskConical size={16} className="text-cyan" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Recall@K Configuration</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Corpus Size</label>
            <input
              type="number" min={100} max={50000} step={500}
              value={corpusSize} onChange={(e) => setCorpusSize(+e.target.value)}
              className="premium-input w-full font-mono"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Golden Queries</label>
            <input
              type="number" min={10} max={1000} step={10}
              value={numQueries} onChange={(e) => setNumQueries(+e.target.value)}
              className="premium-input w-full font-mono"
            />
          </div>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={ingest} onChange={(e) => setIngest(e.target.checked)} className="accent-primary" />
          Ingest corpus before evaluation
        </label>
        <button className="btn-primary mt-4" disabled={isPending} onClick={() => mutate()}>
          <Play size={15} />
          {isPending ? 'Running Evaluation...' : 'Run Accuracy Benchmark'}
        </button>
        {isPending && (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full animate-pulse rounded-full bg-gradient-primary" />
          </div>
        )}
          </div>
        </div>
      </div>

      {!accuracyResults.length && (
        <div className="card p-5">
          <div className="relative z-10 flex h-[240px] items-center justify-center text-sm text-slate-400">
            Run the benchmark to generate Recall@1/5/10, MRR, latency, and error comparisons.
          </div>
        </div>
      )}

      {accuracyResults.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[...accuracyResults].sort((a, b) => (b.MRR ?? 0) - (a.MRR ?? 0)).map((r, idx) => (
              <motion.div key={r.Engine} layout className="card p-5">
                <div className="relative z-10">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold text-white"><Medal size={16} className={idx === 0 ? 'text-cyan' : 'text-slate-500'} />#{idx + 1} {r.Engine}</span>
                    {idx === 0 && <span className="rounded-full border border-cyan/20 bg-cyan/10 px-2 py-1 text-[10px] text-cyan">best performer</span>}
                  </div>
                  <p className="font-mono text-3xl font-bold text-white">{((r.MRR ?? 0) * 100).toFixed(1)}%</p>
                  <p className="mt-1 text-xs text-slate-500">MRR confidence score</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="card p-5">
            <div className="relative z-10 mb-4 flex items-center gap-2">
              <Award size={16} className="text-cyan" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Recall@K Leaderboard</h3>
            </div>
            <RecallBarChart data={accuracyResults} />
          </div>
          <div className="card p-5">
            <div className="relative z-10 mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Performance Radar (Recall + MRR)</h3>
            </div>
            <MRRRadarChart data={accuracyResults} />
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
