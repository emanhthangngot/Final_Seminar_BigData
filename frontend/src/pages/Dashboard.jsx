import { Suspense, lazy } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import DBBadge from '../components/ui/DBBadge'
import { api } from '../services/api'
import {
  activeEngineCount,
  formatLatency,
  latencySummaryByDb,
} from '../utils/benchmarkInsights'

const VectorSpaceScene = lazy(() => import('../components/three/VectorSpaceScene'))
const PerformanceGlobe = lazy(() => import('../components/three/PerformanceGlobe'))

const FADE_UP = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }
const DB_BASICS = [
  {
    db: 'Qdrant',
    implementation: 'Rust',
    focus: 'Vector search combined with payload metadata filtering, plus compression options such as binary quantization for faster search and lower memory pressure.',
    ragRole: 'A strong choice when the demo needs quick semantic retrieval, practical hybrid filtering, and simple self-hosted deployment.',
    details: ['Vector + metadata search', 'Binary quantization', 'Apache 2.0 / Docker self-host'],
  },
  {
    db: 'Weaviate',
    implementation: 'Go',
    focus: 'Schema-driven vector database with native hybrid retrieval, ML framework integrations, and support for multimodal data pipelines.',
    ragRole: 'Useful when RAG queries need both keyword evidence and semantic similarity, especially with richer object schemas or multimodal content.',
    details: ['BM25 + vector hybrid', 'ML integrations', 'BSD-3 / self-host or sandbox'],
  },
  {
    db: 'Milvus',
    implementation: 'C++ / Go',
    focus: 'Distributed vector database designed for very large collections, advanced index choices, and acceleration options including GPU-backed workloads.',
    ragRole: 'Best suited when the benchmark emphasizes scale, collection management, and high-throughput vector search over billions of embeddings.',
    details: ['Billion-scale clusters', 'GPU acceleration', 'Apache 2.0 / Zilliz free tier'],
  },
]

export default function Dashboard() {
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: api.getHealth, refetchInterval: 10_000 })
  const { data: metrics } = useQuery({ queryKey: ['metrics'], queryFn: api.getMetrics, refetchInterval: 30_000 })
  const { data: accuracyResults } = useQuery({
    queryKey: ['benchmark', 'accuracy', 'latest'],
    queryFn: api.getLatestAccuracyBenchmark,
    staleTime: 60_000,
  })

  const dbs = ['Qdrant', 'Weaviate', 'Milvus']
  const latencyByDb = latencySummaryByDb({ accuracyResults, metrics, dbs })
  const avgLatency = (db) => formatLatency(latencyByDb[db])
  const onlineEngines = activeEngineCount(health, dbs)
  const activeEngineDisplay = health?.databases ? String(onlineEngines) : String(dbs.length)
  const globeMetrics = Object.fromEntries(dbs.map((db) => {
    const value = latencyByDb[db]
    return [db, Number.isFinite(value) ? Math.max(0.15, Math.min(1, 1 - value / 100)) : 0.45]
  }))

  return (
    <motion.div variants={{ show: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show" className="space-y-5">
      <motion.section variants={FADE_UP} className="card-glow grid min-h-[170px] grid-cols-1 gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative z-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">overview</span>
            <span className="rounded-full border border-emerald/20 bg-emerald/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-emerald">live RAG benchmark</span>
          </div>
          <h1 className="hero-title max-w-4xl">Compare Qdrant, Weaviate, and Milvus for real RAG workloads.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
            This dashboard summarizes the current health and benchmark signals for the three vector databases used by the RAG chat system. Use it to check which engines are online, compare search latency, review retrieval quality, and decide where to investigate next.
          </p>
          <div className="mt-5 grid max-w-3xl gap-3 text-xs text-slate-400 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
              <p className="font-semibold text-slate-200">1. Check availability</p>
              <p className="mt-1 leading-5">Confirm Qdrant, Weaviate, and Milvus are connected before running comparisons.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
              <p className="font-semibold text-slate-200">2. Compare latency</p>
              <p className="mt-1 leading-5">Use average search time to spot retrieval bottlenecks across engines.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
              <p className="font-semibold text-slate-200">3. Review tradeoffs</p>
              <p className="mt-1 leading-5">Pair dashboard signals with accuracy, hybrid, and RAG chat results.</p>
            </div>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-3">
          {[
            ['Active engines', activeEngineDisplay],
            ['Refresh cadence', '10s'],
            ['Compared DBs', '3'],
            ['Runtime mode', health?.rag?.mock_mode ? 'mock' : 'real'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <p className="font-mono text-xl font-bold text-white">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.div variants={FADE_UP} className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="card ambient-border relative h-[460px] overflow-hidden">
          <Suspense fallback={<div className="h-full skeleton" />}>
            <VectorSpaceScene />
          </Suspense>
          <div className="pointer-events-none absolute left-6 top-5 z-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/75">retrieval space</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">Embedding cluster view</h2>
            <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">A visual map for how the active corpus is distributed in vector space.</p>
          </div>
          <div className="absolute bottom-5 left-6 right-6 z-10 grid grid-cols-3 gap-3">
            {dbs.map((db) => (
              <div key={db} className="rounded-2xl border border-white/10 bg-[#081025]/70 p-3 backdrop-blur-xl">
                <DBBadge name={db} />
                <p className="mt-2 font-mono text-xs text-slate-500">{avgLatency(db)}ms avg search</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card relative h-[460px] overflow-hidden">
          <Suspense fallback={<div className="h-full skeleton" />}>
            <PerformanceGlobe metrics={globeMetrics} />
          </Suspense>
          <div className="pointer-events-none absolute left-6 top-5 z-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary/80">system health</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">Engine performance signal</h2>
            <p className="mt-2 max-w-xs text-xs leading-5 text-slate-400">A compact health view based on the latest benchmark and telemetry data.</p>
          </div>
          <div className="absolute bottom-5 left-5 right-5 z-10 rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Current setup</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-mono text-lg font-bold text-white">{activeEngineDisplay}</p>
                <p className="text-[11px] text-slate-500">online</p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-white">{health?.rag?.model ?? 'qwen2.5:1.5b'}</p>
                <p className="text-[11px] text-slate-500">LLM</p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-white">{health?.rag?.mock_mode ? 'mock' : 'real'}</p>
                <p className="text-[11px] text-slate-500">mode</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={FADE_UP} className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
        {DB_BASICS.map(({ db, implementation, focus, ragRole, details }) => (
          <div key={db} className="card group p-5">
            <div className="relative z-10 space-y-3">
              <DBBadge name={db} />
              <p className="font-mono text-xs text-slate-500">Implementation: {implementation}</p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Core focus</p>
                <p className="mt-1 leading-6 text-slate-300">{focus}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">RAG role</p>
                <p className="mt-1 leading-6 text-slate-400">{ragRole}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {details.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] text-slate-400">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}
