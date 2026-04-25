import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { RecallBarChart, MRRRadarChart } from '../components/charts/RecallChart'
import { useBenchmarkStore } from '../store/benchmarkStore'
import { api } from '../services/api'

export default function AccuracyPage() {
  const { accuracyResults, setAccuracyResults } = useBenchmarkStore()
  const [corpusSize, setCorpusSize] = useState(1000)
  const [numQueries, setNumQueries] = useState(50)
  const [ingest, setIngest] = useState(true)
  const [progress, setProgress] = useState(0)

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.runAccuracyBenchmark(corpusSize, numQueries, ingest),
    onSuccess: (data) => { setAccuracyResults(data); setProgress(1) },
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300">Recall@K Configuration</h3>
        <p className="text-xs text-gray-500">
          Synthetic corpus with deterministic seed — each chunk carries a <code className="font-mono text-primary">[CID:…]</code> tag.
          Recall is scored by exact chunk-ID match. No LLM-as-judge, fully reproducible.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Corpus Size</label>
            <input
              type="number" min={100} max={50000} step={500}
              value={corpusSize} onChange={(e) => setCorpusSize(+e.target.value)}
              className="w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Golden Queries</label>
            <input
              type="number" min={10} max={1000} step={10}
              value={numQueries} onChange={(e) => setNumQueries(+e.target.value)}
              className="w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input type="checkbox" checked={ingest} onChange={(e) => setIngest(e.target.checked)} className="accent-primary" />
          Ingest corpus before evaluation
        </label>
        <button className="btn-primary" disabled={isPending} onClick={() => mutate()}>
          {isPending ? 'Running Evaluation...' : 'Run Accuracy Benchmark'}
        </button>
        {isPending && (
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-primary rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        )}
      </div>

      {accuracyResults.length > 0 && (
        <>
          <div className="card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">Recall@K Leaderboard</h3>
            <RecallBarChart data={accuracyResults} />
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">Performance Radar (Recall + MRR)</h3>
            <MRRRadarChart data={accuracyResults} />
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-xs font-mono">
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
