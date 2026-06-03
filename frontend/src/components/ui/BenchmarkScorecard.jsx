import { BarChart3, Database, Filter, GitCompare, Timer, Zap } from 'lucide-react'
import { formatPercent } from '../../utils/benchmarkInsights'

const numberValue = (row, ...keys) => {
  for (const key of keys) {
    const value = Number(row?.[key])
    if (Number.isFinite(value)) return value
  }
  return 0
}

const engineTone = (engine) => ({
  Qdrant: 'border-qdrant/30 bg-qdrant/10 text-qdrant',
  Weaviate: 'border-weaviate/30 bg-weaviate/10 text-weaviate',
  Milvus: 'border-milvus/30 bg-milvus/10 text-milvus',
}[engine] ?? 'border-white/10 bg-white/[0.035] text-slate-300')

export default function BenchmarkScorecard({ accuracy = [], tradeoff = [], insights }) {
  if (!accuracy.length && !tradeoff.length) return null

  const bestRecall = accuracy.reduce((best, row) =>
    numberValue(row, 'Recall@10') > numberValue(best, 'Recall@10') ? row : best, accuracy[0] ?? {})
  const lowestLatency = accuracy.reduce((best, row) => {
    const latency = numberValue(row, 'AvgLatency_ms')
    const bestLatency = numberValue(best, 'AvgLatency_ms')
    return latency > 0 && (!bestLatency || latency < bestLatency) ? row : best
  }, accuracy[0] ?? {})
  const bestBalanced = tradeoff.reduce((best, row) => {
    const score = numberValue(row, 'AvgLatency_ms') ? numberValue(row, 'Recall') / numberValue(row, 'AvgLatency_ms') : -1
    const bestScore = numberValue(best, 'AvgLatency_ms') ? numberValue(best, 'Recall') / numberValue(best, 'AvgLatency_ms') : -1
    return score > bestScore ? row : best
  }, tradeoff[0] ?? {})

  const scenarios = [
    [Filter, 'Metadata-filtered queries', 'Qdrant', insights?.qdrant?.note ?? 'Payload pre-filter reduces ANN candidate space.'],
    [GitCompare, 'Keyword-heavy technical docs', 'Weaviate', insights?.weaviate?.note ?? 'BM25 lane captures exact terms alongside semantic matches.'],
    [Database, 'High concurrency / scale', 'Milvus', insights?.milvus?.note ?? 'In-memory load amortizes repeated query cost.'],
    [Zap, 'Best raw Recall@10', bestRecall.Engine ?? 'n/a', bestRecall.Engine ? `${formatPercent(numberValue(bestRecall, 'Recall@10'))} on this corpus.` : 'Run benchmark to compute.'],
    [Timer, 'Lowest avg latency', lowestLatency.Engine ?? 'n/a', lowestLatency.Engine ? `${numberValue(lowestLatency, 'AvgLatency_ms').toFixed(2)}ms average.` : 'Run benchmark to compute.'],
    [BarChart3, 'Best recall/latency tradeoff', bestBalanced.Engine ?? 'n/a', bestBalanced.Engine ? `top_k=${bestBalanced.top_k}; strongest recall per millisecond.` : 'Run sweep to compute.'],
  ]

  return (
    <section className="card p-5">
      <div className="relative z-10">
        <div className="mb-4 flex items-center gap-2">
          <Zap size={17} className="text-cyan" />
          <h2 className="text-lg font-bold text-white">Best For Scorecard</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {scenarios.map(([Icon, label, winner, reason]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Icon size={17} className="text-cyan" />
                <span className={`rounded-full border px-2 py-1 font-mono text-[10px] ${engineTone(winner)}`}>{winner}</span>
              </div>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{reason}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
