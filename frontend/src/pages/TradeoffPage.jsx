import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import TradeoffCurve from '../components/charts/TradeoffCurve'
import { useBenchmarkStore } from '../store/benchmarkStore'
import { api } from '../services/api'
import { tradeoffConclusion } from '../utils/benchmarkInsights'
import { BrainCircuit, Crosshair, Sparkles } from 'lucide-react'

export default function TradeoffPage() {
  const { tradeoffResults, setTradeoffResults } = useBenchmarkStore()

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

  const conclusion = tradeoffConclusion(tradeoffResults)

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
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Saved Sweep</h3>
            </div>
            <p className="text-sm text-slate-400">
              top_k ∈ <code className="font-mono text-primary">{'{'} 1, 2, 5, 10, 20, 50 {'}'}</code>
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              The chart loads the latest stored sweep automatically to avoid changing seminar results during presentation.
            </p>
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
            <h3 className="text-sm font-semibold text-white">Seminar conclusion</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {conclusion}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
