import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, Play, RefreshCw, Settings2 } from 'lucide-react'
import { RecallBarChart } from '../components/charts/RecallChart'
import TradeoffCurve from '../components/charts/TradeoffCurve'
import DBMechanismScene from '../components/three/DBMechanismScene'
import BenchmarkScorecard from '../components/ui/BenchmarkScorecard'
import { api } from '../services/api'
import { formatPercent, tradeoffConclusion } from '../utils/benchmarkInsights'

function ConfigField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  )
}

export default function BenchmarkWorkflowPage() {
  const [jobId, setJobId] = useState(null)
  const [config, setConfig] = useState({
    corpusSize: 1000,
    numQueries: 20,
    resetCollections: true,
    runAccuracy: true,
    runTradeoff: true,
  })

  const { data: latestJob } = useQuery({
    queryKey: ['benchmark', 'jobs', 'latest'],
    queryFn: api.getLatestBenchmarkJob,
    retry: false,
    refetchInterval: 30_000,
  })
  const { data: activeJob } = useQuery({
    queryKey: ['benchmark', 'jobs', jobId],
    queryFn: () => api.getBenchmarkJob(jobId),
    enabled: Boolean(jobId),
    refetchInterval: (query) => ['completed', 'failed'].includes(query.state.data?.status) ? false : 3_000,
  })
  const { data: latestAccuracy = [] } = useQuery({
    queryKey: ['benchmark', 'accuracy', 'latest'],
    queryFn: api.getLatestAccuracyBenchmark,
  })
  const { data: latestTradeoff = [] } = useQuery({
    queryKey: ['benchmark', 'tradeoff', 'latest'],
    queryFn: api.getLatestTradeoffSweep,
  })

  const startBenchmark = useMutation({
    mutationFn: api.startFullBenchmark,
    onSuccess: (job) => setJobId(job.job_id),
  })

  const job = activeJob ?? latestJob
  const accuracy = job?.accuracy?.length ? job.accuracy : latestAccuracy
  const tradeoff = job?.tradeoff?.length ? job.tradeoff : latestTradeoff
  const conclusion = useMemo(() => tradeoffConclusion(tradeoff), [tradeoff])
  const running = startBenchmark.isPending || job?.status === 'running'
  const bestAccuracy = [...accuracy].sort((a, b) => Number(b['Recall@10'] ?? 0) - Number(a['Recall@10'] ?? 0))[0]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <section className="card-glow p-6">
        <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/75">Benchmark results</p>
            <h1 className="hero-title mt-2">Recall, Latency, Trade-off</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Chạy benchmark demo bằng cấu hình gọn, sau đó tập trung vào kết quả so sánh thay vì stage log.
            </p>
            <div className="mt-4 grid max-w-2xl gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Best Recall@10</p>
                <p className="mt-1 font-mono text-sm text-white">{bestAccuracy ? `${bestAccuracy.Engine} · ${formatPercent(bestAccuracy['Recall@10'])}` : 'n/a'}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Accuracy rows</p>
                <p className="mt-1 font-mono text-sm text-white">{accuracy.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Tradeoff rows</p>
                <p className="mt-1 font-mono text-sm text-white">{tradeoff.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Settings2 size={17} className="text-cyan" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Run config</h2>
            </div>
            <div className="grid gap-3">
              <ConfigField label="Corpus size">
                <input
                  type="number"
                  min="100"
                  max="200000"
                  value={config.corpusSize}
                  onChange={(event) => setConfig((prev) => ({ ...prev, corpusSize: Number(event.target.value) }))}
                  className="premium-input w-full"
                />
              </ConfigField>
              <ConfigField label="Golden queries">
                <input
                  type="number"
                  min="10"
                  max="2000"
                  value={config.numQueries}
                  onChange={(event) => setConfig((prev) => ({ ...prev, numQueries: Number(event.target.value) }))}
                  className="premium-input w-full"
                />
              </ConfigField>
              {[
                ['resetCollections', 'Reset collections before ingest'],
                ['runAccuracy', 'Run Recall@K and MRR'],
                ['runTradeoff', 'Run top_k trade-off sweep'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={config[key]}
                    onChange={(event) => setConfig((prev) => ({ ...prev, [key]: event.target.checked }))}
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={running}
              onClick={() => startBenchmark.mutate(config)}
              className="btn-primary mt-4 w-full justify-center py-3"
            >
              {running ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
              {running ? 'Benchmark đang chạy...' : 'Run benchmark'}
            </button>
          </div>
        </div>
      </section>

      <section className="card h-[300px] p-0">
        <div className="relative z-10 h-full">
          <DBMechanismScene mode="tradeoff" accuracy={accuracy} tradeoff={tradeoff} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="card p-5">
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 size={17} className="text-cyan" />
              <h2 className="text-lg font-bold text-white">Accuracy results</h2>
            </div>
            <RecallBarChart data={accuracy} />
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-white/[0.035] text-slate-500">
                  <tr>{['Engine', 'Recall@10', 'MRR', 'Avg ms', 'Errors'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {accuracy.map((row) => (
                    <tr key={row.Engine} className="border-b border-white/5 last:border-b-0">
                      <td className="px-3 py-2 font-semibold text-white">{row.Engine}</td>
                      <td className="px-3 py-2 text-slate-300">{formatPercent(row['Recall@10'])}</td>
                      <td className="px-3 py-2 text-slate-300">{Number(row.MRR ?? 0).toFixed(4)}</td>
                      <td className="px-3 py-2 text-slate-300">{Number(row.AvgLatency_ms ?? 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-slate-300">{row.Errors ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 size={17} className="text-cyan" />
              <h2 className="text-lg font-bold text-white">Trade-off results</h2>
            </div>
            <TradeoffCurve data={tradeoff} />
            <p className="mt-4 rounded-xl border border-cyan/15 bg-cyan/5 p-4 text-sm leading-6 text-slate-300">{conclusion}</p>
          </div>
        </div>
      </section>

      <BenchmarkScorecard accuracy={accuracy} tradeoff={tradeoff} insights={job?.db_insights} />
    </motion.div>
  )
}
