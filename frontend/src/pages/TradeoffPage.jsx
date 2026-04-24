import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import TradeoffCurve from '../components/charts/TradeoffCurve'
import { useBenchmarkStore } from '../store/benchmarkStore'
import { api } from '../services/api'

export default function TradeoffPage() {
  const { tradeoffResults, setTradeoffResults } = useBenchmarkStore()
  const [ingest, setIngest] = useState(false)

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.runTradeoffSweep(ingest),
    onSuccess: setTradeoffResults,
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300">Recall vs Latency Pareto Sweep</h3>
        <p className="text-xs text-gray-500">
          Sweeps <code className="font-mono text-primary">top_k ∈ {'{'} 1, 2, 5, 10, 20, 50 {'}'}</code> for all three engines on the same golden query set.
          The curve nearest the <span className="text-white font-semibold">top-left corner</span> wins — highest accuracy at lowest latency.
        </p>
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input type="checkbox" checked={ingest} onChange={(e) => setIngest(e.target.checked)} className="accent-primary" />
          Ingest corpus before sweep
        </label>
        <button className="btn-primary" disabled={isPending} onClick={() => mutate()}>
          {isPending ? 'Sweeping...' : 'Run Tradeoff Sweep'}
        </button>
        {isPending && (
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-primary rounded-full animate-pulse w-3/4" />
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">Pareto Frontier</h3>
        <TradeoffCurve data={tradeoffResults} />
      </div>
    </motion.div>
  )
}
