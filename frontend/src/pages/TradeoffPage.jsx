import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQuery } from '@tanstack/react-query'
import TradeoffCurve from '../components/charts/TradeoffCurve'
import { useBenchmarkStore } from '../store/benchmarkStore'
import { api } from '../services/api'
import { BrainCircuit, Crosshair, Play, Sparkles } from 'lucide-react'

export default function TradeoffPage() {
  const { tradeoffResults, setTradeoffResults } = useBenchmarkStore()
  const [ingest, setIngest] = useState(false)

  const { data: latestTradeoff = [] } = useQuery({
    queryKey: ['benchmark', 'tradeoff', 'latest'],
    queryFn: api.getLatestTradeoffSweep,
    enabled: tradeoffResults.length === 0,
  })

  useEffect(() => {
    if (!tradeoffResults.length && latestTradeoff.length) {
      setTradeoffResults(latestTradeoff)
    }
  }, [latestTradeoff, setTradeoffResults, tradeoffResults.length])

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.runTradeoffSweep(ingest),
    onSuccess: setTradeoffResults,
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="card-glow p-6">
        <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/75">Pareto Explorer</p>
            <h1 className="hero-title mt-2">Decision intelligence for recall and latency tradeoffs.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Sweep top_k values, reveal frontier points, and identify the best retrieval route under response-time constraints.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <div className="mb-4 flex items-center gap-2">
              <Crosshair size={16} className="text-cyan" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Sweep Control</h3>
            </div>
            <p className="text-sm text-slate-400">
              top_k ∈ <code className="font-mono text-primary">{'{'} 1, 2, 5, 10, 20, 50 {'}'}</code>
            </p>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={ingest} onChange={(e) => setIngest(e.target.checked)} className="accent-primary" />
              Ingest corpus before sweep
            </label>
            <button className="btn-primary mt-4" disabled={isPending} onClick={() => mutate()}>
              <Play size={15} />
              {isPending ? 'Sweeping...' : 'Run Tradeoff Sweep'}
            </button>
            {isPending && (
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-3/4 animate-pulse rounded-full bg-gradient-primary" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BrainCircuit size={16} className="text-cyan" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Interactive Pareto Frontier</h3>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-[10px] text-primary">frontier highlight</span>
        </div>
        <TradeoffCurve data={tradeoffResults} />
      </div>

      <div className="card p-5">
        <div className="relative z-10 flex items-start gap-3">
          <Sparkles size={18} className="mt-0.5 text-cyan" />
          <div>
            <h3 className="text-sm font-semibold text-white">AI-generated conclusion</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Prefer the point that preserves recall above 90% while minimizing p95 movement. If frontier curves overlap, route by operational maturity and SDK ergonomics.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
