import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, Database, Server } from 'lucide-react'
import DBMechanismScene from '../components/three/DBMechanismScene'
import DBBadge from '../components/ui/DBBadge'
import BenchmarkScorecard from '../components/ui/BenchmarkScorecard'
import { api } from '../services/api'
import { DB_DEMOS } from '../utils/databaseDemos'
import { activeEngineCount, formatPercent, tradeoffConclusion } from '../utils/benchmarkInsights'

const DBS = ['Qdrant', 'Weaviate', 'Milvus']

function MetricCard({ label, value, tone = 'text-white' }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <p className={`font-mono text-xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  )
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div className="mb-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan/75">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-bold text-white md:text-2xl">{title}</h2>
    </div>
  )
}

export default function Dashboard() {
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: api.getHealth, refetchInterval: 10_000 })
  const { data: setup } = useQuery({ queryKey: ['benchmark', 'setup'], queryFn: api.getBenchmarkSetup })
  const { data: accuracy = [] } = useQuery({ queryKey: ['benchmark', 'accuracy', 'latest'], queryFn: api.getLatestAccuracyBenchmark })
  const { data: tradeoff = [] } = useQuery({ queryKey: ['benchmark', 'tradeoff', 'latest'], queryFn: api.getLatestTradeoffSweep })

  const onlineCount = activeEngineCount(health, DBS)
  const bestAccuracy = [...accuracy].sort((a, b) => Number(b['Recall@10'] ?? 0) - Number(a['Recall@10'] ?? 0))[0]
  const conclusion = tradeoffConclusion(tradeoff)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <section className="card-glow p-6">
        <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/75">Overview</p>
            <h1 className="hero-title mt-2">Vector Database RAG Benchmark</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
              Tổng quan môi trường local, cấu hình RAG, tình trạng ba vector database và kết quả benchmark mới nhất.
              Các demo chi tiết được tách riêng theo từng database và workflow benchmark.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Databases online" value={`${health?.databases ? onlineCount : 0}/3`} tone="text-emerald" />
            <MetricCard label="Mode" value={setup?.runtime?.mock_mode ? 'mock' : 'real'} tone={setup?.runtime?.mock_mode ? 'text-amber-300' : 'text-emerald'} />
            <MetricCard label="LLM" value={setup?.runtime?.llm_model ?? 'qwen2.5:1.5b'} />
            <MetricCard label="Embedding" value={setup?.runtime?.embedding_model ?? 'nomic-embed-text'} />
          </div>
        </div>
      </section>

      <section className="card h-[620px] p-0">
        <div className="relative z-10 h-full">
          <DBMechanismScene mode="overview" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="card p-5">
          <div className="relative z-10">
            <SectionTitle eyebrow="local setup" title="Cấu hình triển khai hiện tại" />
            <div className="grid gap-3 md:grid-cols-3">
              {DBS.map((db) => {
                const dbSetup = setup?.databases?.[db] ?? {}
                return (
                  <div key={db} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <DBBadge name={db} />
                      <span className={`h-2.5 w-2.5 rounded-full ${health?.databases?.[db] ? 'bg-emerald' : 'bg-slate-600'}`} />
                    </div>
                    <div className="space-y-2 text-xs text-slate-400">
                      <p><span className="text-slate-500">Ports:</span> {dbSetup.ports?.join(', ') ?? 'n/a'}</p>
                      <p><span className="text-slate-500">RAM:</span> {dbSetup.ram_limit ?? 'n/a'}</p>
                      <p><span className="text-slate-500">Collection:</span> {dbSetup.collection ?? 'n/a'}</p>
                      <p><span className="text-slate-500">Deps:</span> {dbSetup.dependencies?.length ? dbSetup.dependencies.join(', ') : 'none'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 rounded-xl border border-cyan/15 bg-cyan/5 p-4 text-sm leading-6 text-slate-300">
              Shared config: {setup?.fairness?.vector_dim ?? 768} dimensions, {setup?.fairness?.distance_metric ?? 'COSINE'}, {setup?.fairness?.index_type ?? 'HNSW'},
              M={setup?.fairness?.hnsw_m ?? 16}, ef_search={setup?.fairness?.ef_search ?? 64}.
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="relative z-10">
              <SectionTitle eyebrow="latest result" title="Benchmark mới nhất" />
              <div className="grid gap-3">
                <MetricCard label="Best Recall@10" value={bestAccuracy ? `${bestAccuracy.Engine} · ${formatPercent(bestAccuracy['Recall@10'])}` : 'n/a'} />
                <MetricCard label="Accuracy rows" value={accuracy.length} />
                <MetricCard label="Trade-off rows" value={tradeoff.length} />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">{conclusion}</p>
              <Link to="/benchmark-workflow" className="btn-primary mt-4 w-full justify-center py-3">
                <BarChart3 size={15} />
                Open Benchmark Workflow
              </Link>
            </div>
          </div>
        </div>
      </section>

      <BenchmarkScorecard accuracy={accuracy} tradeoff={tradeoff} />

      <section className="card p-5">
        <div className="relative z-10">
          <SectionTitle eyebrow="database demos" title="Demo điểm nổi bật theo từng database" />
          <div className="grid gap-3 md:grid-cols-3">
            {Object.values(DB_DEMOS).map((demo) => {
              const Icon = demo.icon
              return (
                <Link key={demo.name} to={demo.route} className="rounded-xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyan/30 hover:bg-cyan/5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <DBBadge name={demo.name} />
                    <Icon size={17} className="text-cyan" />
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan/70">{demo.label}</p>
                  <h3 className="mt-2 text-base font-bold text-white">{demo.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{demo.focus}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-cyan">
                    Open demo <ArrowRight size={13} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Server size={18} className="mt-1 text-cyan" />
            <div>
              <h2 className="text-lg font-bold text-white">RAG flow</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Upload tài liệu, chunk text, embed query, retrieve evidence trong database đã chọn, sau đó sinh câu trả lời bằng LLM.
              </p>
            </div>
          </div>
          <Link to="/rag-chat" className="btn-secondary justify-center py-3">
            <Database size={15} />
            Open RAG Chat
          </Link>
        </div>
      </section>
    </motion.div>
  )
}
