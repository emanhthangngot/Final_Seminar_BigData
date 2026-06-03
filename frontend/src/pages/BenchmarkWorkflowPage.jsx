import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, CheckCircle2, Clock, Play, RefreshCw, Settings2 } from 'lucide-react'
import { RecallBarChart } from '../components/charts/RecallChart'
import TradeoffCurve from '../components/charts/TradeoffCurve'
import { api } from '../services/api'
import { formatPercent, tradeoffConclusion } from '../utils/benchmarkInsights'

const STAGES = [
  { key: 'prepare', label: 'Setup', description: 'Đọc cấu hình runtime, database và tham số benchmark.' },
  { key: 'reset', label: 'Reset & index', description: 'Reset collection nếu được bật, sau đó ingest corpus benchmark.' },
  { key: 'accuracy', label: 'Accuracy', description: 'Chạy Recall@1/5/10 và MRR trên golden queries.' },
  { key: 'tradeoff', label: 'Trade-off', description: 'Chạy sweep top_k để đo quan hệ recall và latency.' },
  { key: 'completed', label: 'Results', description: 'Hiển thị bảng và biểu đồ kết quả cuối cùng.' },
]

const isFinished = (job) => job && ['completed', 'failed'].includes(job.status)

function eventStatus(job, stageKey) {
  const events = job?.events?.filter((event) => event.stage === stageKey) ?? []
  return events.at(-1)?.status ?? 'pending'
}

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
  const [selectedStage, setSelectedStage] = useState('prepare')
  const [config, setConfig] = useState({
    corpusSize: 10_000,
    numQueries: 200,
    resetCollections: true,
    runAccuracy: true,
    runTradeoff: true,
  })

  const { data: setup } = useQuery({ queryKey: ['benchmark', 'setup'], queryFn: api.getBenchmarkSetup })
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
    refetchInterval: (query) => isFinished(query.state.data) ? false : 3_000,
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
    onSuccess: (job) => {
      setJobId(job.job_id)
      setSelectedStage('prepare')
    },
  })

  const job = activeJob ?? latestJob
  const accuracy = job?.accuracy?.length ? job.accuracy : latestAccuracy
  const tradeoff = job?.tradeoff?.length ? job.tradeoff : latestTradeoff
  const selectedEvents = job?.events?.filter((event) => event.stage === selectedStage) ?? []
  const conclusion = useMemo(() => tradeoffConclusion(tradeoff), [tradeoff])
  const running = startBenchmark.isPending || job?.status === 'running'

  useEffect(() => {
    if (latestJob?.status && !isFinished(latestJob) && !jobId) {
      setJobId(latestJob.job_id)
      setSelectedStage(latestJob.stage ?? 'prepare')
    }
  }, [latestJob, jobId])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <section className="card-glow p-6">
        <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/75">Benchmark workflow</p>
            <h1 className="hero-title mt-2">Interactive RAG Benchmark Workflow</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Trang này tái hiện toàn bộ quá trình benchmark: setup, reset/index, accuracy, trade-off và kết quả cuối.
              Người dùng có thể chỉnh cấu hình trước khi chạy và chọn từng stage để xem lại chi tiết.
            </p>
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
              {running ? 'Benchmark đang chạy...' : 'Run benchmark workflow'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="card p-5">
          <div className="relative z-10">
            <h2 className="mb-4 text-lg font-bold text-white">Process stages</h2>
            <div className="space-y-2">
              {STAGES.map((stage, index) => {
                const status = eventStatus(job, stage.key)
                const active = selectedStage === stage.key
                return (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => setSelectedStage(stage.key)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active ? 'border-cyan/35 bg-cyan/10' : 'border-white/10 bg-white/[0.035] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan/70">Stage {index + 1}</span>
                      <span className={`font-mono text-[10px] ${status === 'completed' ? 'text-emerald' : status === 'running' ? 'text-cyan' : status === 'failed' ? 'text-rose-300' : 'text-slate-500'}`}>
                        {status}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-white">{stage.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{stage.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="relative z-10">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan/75">Stage detail</p>
                <h2 className="mt-1 text-xl font-bold text-white">{STAGES.find((stage) => stage.key === selectedStage)?.label}</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 font-mono text-[10px] text-slate-400">
                {job?.status ?? 'no active job'} · {job?.progress ?? 0}%
              </span>
            </div>

            {selectedStage === 'prepare' && setup && (
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                {Object.entries(setup.databases ?? {}).map(([db, dbSetup]) => (
                  <div key={db} className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs text-slate-400">
                    <p className="font-semibold text-white">{db}</p>
                    <p className="mt-2">Ports: {dbSetup.ports?.join(', ')}</p>
                    <p>RAM: {dbSetup.ram_limit}</p>
                    <p>Deps: {dbSetup.dependencies?.length ? dbSetup.dependencies.join(', ') : 'none'}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {selectedEvents.length ? selectedEvents.map((event, index) => (
                <div key={`${event.stage}-${event.timestamp}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {event.status === 'completed' ? <CheckCircle2 size={15} className="text-emerald" /> : <Clock size={15} className="text-cyan" />}
                      <p className="text-sm font-semibold text-white">{event.message}</p>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {Object.keys(event.data ?? {}).length > 0 && (
                    <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-[11px] text-slate-300">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  )}
                </div>
              )) : (
                <p className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-slate-400">
                  Chưa có event cho stage này. Chạy benchmark hoặc chọn stage đã hoàn tất để xem chi tiết.
                </p>
              )}
            </div>
          </div>
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
    </motion.div>
  )
}
