import { Navigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, Database, Play, SlidersHorizontal } from 'lucide-react'
import DBBadge from '../components/ui/DBBadge'
import { api } from '../services/api'
import { DB_DEMOS } from '../utils/databaseDemos'

const fallbackSetup = {
  fairness: { vector_dim: 768, distance_metric: 'COSINE', index_type: 'HNSW', hnsw_m: 16, ef_construction: 128, ef_search: 64 },
  databases: {},
}

function SetupTable({ setup, db }) {
  const dbSetup = setup.databases?.[db] ?? {}
  const rows = [
    ['Image', dbSetup.image],
    ['Ports', dbSetup.ports?.join(', ')],
    ['RAM limit', dbSetup.ram_limit],
    ['Volume', dbSetup.volume],
    ['Dependencies', dbSetup.dependencies?.length ? dbSetup.dependencies.join(', ') : 'none'],
    ['Collection', dbSetup.collection],
    ['Index', dbSetup.index],
    ['Vector config', `${setup.fairness?.vector_dim} dim · ${setup.fairness?.distance_metric} · ${setup.fairness?.index_type}`],
    ['HNSW', `M=${setup.fairness?.hnsw_m}, ef_construction=${setup.fairness?.ef_construction}, ef_search=${setup.fairness?.ef_search}`],
  ]
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Local setup</h3>
      <div className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 text-xs sm:grid-cols-[130px_minmax(0,1fr)]">
            <span className="text-slate-500">{label}</span>
            <span className="break-words font-mono text-slate-300">{value ?? 'n/a'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DatabaseDemoPage() {
  const { db } = useParams()
  const demo = DB_DEMOS[db]
  const { data: setup = fallbackSetup } = useQuery({ queryKey: ['benchmark', 'setup'], queryFn: api.getBenchmarkSetup })
  const rag = useMutation({ mutationFn: ({ query, topK }) => api.chat(query, demo.name, topK) })
  const hybrid = useMutation({ mutationFn: ({ query, topK }) => api.runHybridBenchmark(query, demo.filters, topK, demo.alpha) })

  if (!demo) return <Navigate to="/dashboard" replace />

  const Icon = demo.icon
  const ragResult = rag.data
  const hybridRow = hybrid.data?.find((row) => row.Engine === demo.name)
  const stageTiming = {
    'Embed query': ragResult?.embedding_ms,
    'Apply payload filter': hybridRow?.Latency_ms,
    'Hybrid query': hybridRow?.Latency_ms,
    'Load collection': hybridRow?.Latency_ms,
    'Search with expr': hybridRow?.Latency_ms,
    'Retrieve evidence': ragResult?.retrieval_ms,
    'Generate answer': ragResult?.generation_ms,
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <section className="card-glow p-6">
        <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <DBBadge name={demo.name} />
              <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan">{demo.label}</span>
            </div>
            <h1 className="hero-title max-w-4xl">{demo.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">{demo.summary}</p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{demo.focus}</p>
          </div>
          <SetupTable setup={setup} db={demo.name} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="card p-5">
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-2">
              <Icon size={17} className="text-cyan" />
              <h2 className="text-lg font-bold text-white">Retrieval process</h2>
            </div>
            <div className="grid gap-3">
              {demo.stages.map(([title, description], index) => (
                <div key={title} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan/70">Stage {index + 1}</p>
                      <h3 className="mt-1 text-sm font-semibold text-white">{title}</h3>
                    </div>
                    <span className="font-mono text-xs text-slate-400">
                      {stageTiming[title] !== undefined ? `${Number(stageTiming[title]).toFixed(2)} ms` : 'ready'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-2">
                <SlidersHorizontal size={17} className="text-cyan" />
                <h2 className="text-lg font-bold text-white">Run demo</h2>
              </div>
              <p className="text-sm leading-6 text-slate-400">{demo.query}</p>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/25 p-3 font-mono text-[11px] leading-5 text-slate-300">{demo.code}</pre>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => hybrid.mutate({ query: demo.query, topK: 5 })}
                  disabled={hybrid.isPending}
                  className="btn-secondary justify-center py-3"
                >
                  <Database size={15} />
                  {hybrid.isPending ? 'Running...' : 'Run filter'}
                </button>
                <button
                  type="button"
                  onClick={() => rag.mutate({ query: demo.query, topK: 5 })}
                  disabled={rag.isPending}
                  className="btn-primary justify-center py-3"
                >
                  <Play size={15} />
                  {rag.isPending ? 'Running...' : 'Run RAG'}
                </button>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="relative z-10">
              <div className="mb-3 flex items-center gap-2">
                <Activity size={16} className="text-cyan" />
                <h2 className="text-lg font-bold text-white">Result</h2>
              </div>
              {hybridRow && (
                <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><p className="text-slate-500">Hybrid ms</p><p className="mt-1 font-mono text-white">{Number(hybridRow.Latency_ms).toFixed(2)}</p></div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><p className="text-slate-500">Results</p><p className="mt-1 font-mono text-white">{hybridRow.ResultCount}</p></div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><p className="text-slate-500">Errors</p><p className="mt-1 font-mono text-white">{hybridRow.Errors}</p></div>
                </div>
              )}
              {ragResult ? (
                <div>
                  <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><p className="text-slate-500">Total ms</p><p className="mt-1 font-mono text-white">{Number(ragResult.total_ms).toFixed(2)}</p></div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><p className="text-slate-500">Retrieval ms</p><p className="mt-1 font-mono text-white">{Number(ragResult.retrieval_ms).toFixed(2)}</p></div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><p className="text-slate-500">Chunks</p><p className="mt-1 font-mono text-white">{ragResult.result_count}</p></div>
                  </div>
                  <p className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-slate-300">{ragResult.answer}</p>
                  <div className="mt-3 space-y-2">
                    {ragResult.context_chunks?.map((chunk, index) => (
                      <p key={index} className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-400">{chunk}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-400">Run filter hoặc RAG để xem latency, evidence và câu trả lời.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  )
}
