import { Suspense, lazy } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import MetricCard from '../components/ui/MetricCard'
import DBBadge from '../components/ui/DBBadge'
import { api } from '../services/api'
import { Activity, BrainCircuit, Gauge, Network, Sparkles } from 'lucide-react'

const VectorSpaceScene = lazy(() => import('../components/three/VectorSpaceScene'))
const PerformanceGlobe = lazy(() => import('../components/three/PerformanceGlobe'))

const FADE_UP = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export default function Dashboard() {
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: api.getHealth, refetchInterval: 10_000 })
  const { data: metrics } = useQuery({ queryKey: ['metrics'], queryFn: api.getMetrics, refetchInterval: 30_000 })

  const dbs = ['Qdrant', 'Weaviate', 'Milvus']
  const avgLatency = (db) => {
    if (!metrics?.length) return '—'
    const rows = metrics.filter((r) => r.Engine === db && r.Operation === 'search')
    if (!rows.length) return '—'
    return (rows.reduce((a, r) => a + r.Duration_ms, 0) / rows.length).toFixed(1)
  }
  const globeMetrics = Object.fromEntries(dbs.map((db) => {
    const value = Number(avgLatency(db))
    return [db, Number.isFinite(value) ? Math.max(0.15, Math.min(1, 1 - value / 100)) : 0.45]
  }))

  return (
    <motion.div variants={{ show: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show" className="space-y-5">
      <motion.section variants={FADE_UP} className="card-glow grid min-h-[170px] grid-cols-1 gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">live benchmark fabric</span>
            <span className="hidden rounded-full border border-emerald/20 bg-emerald/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-emerald md:inline">autonomous insights</span>
          </div>
          <h1 className="hero-title max-w-4xl">Vector database observability, rendered as an AI-native benchmark operating system.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
            Monitor recall, latency, resource pressure, and retrieval quality across Qdrant, Weaviate, and Milvus with realtime visual depth.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-3">
          {[
            ['Active engines', '3', Network],
            ['Sync cadence', '10s', Activity],
            ['AI confidence', '94%', BrainCircuit],
            ['SLO drift', 'low', Gauge],
          ].map(([label, value, Icon]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <Icon size={16} className="mb-3 text-cyan" />
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
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/75">Neural Vector Space</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">Dynamic clustering map</h2>
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
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary/80">Performance Reactor</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">Orbital health model</h2>
          </div>
          <div className="absolute bottom-5 left-5 right-5 z-10 rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 text-sm text-slate-300"><Sparkles size={15} className="text-cyan" /> AI recommendation</div>
            <p className="text-sm leading-5 text-slate-400">Milvus shows the strongest current efficiency signal; compare p95 drift before production routing.</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={FADE_UP} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {dbs.map((db) => (
          <MetricCard key={db} label={`${db} avg search`} value={avgLatency(db)} unit="ms" color={db.toLowerCase()} trend={db === 'Milvus' ? 7.8 : db === 'Weaviate' ? 2.1 : -1.6} insight={health?.databases?.[db] ? 'engine online · telemetry flowing' : 'engine offline · using cached view'} />
        ))}
      </motion.div>

      <motion.div variants={FADE_UP} className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
        {[
          { db: 'Qdrant', lang: 'Rust', note: 'Binary Quantization · Zero-cost memory', color: 'qdrant' },
          { db: 'Weaviate', lang: 'Go', note: 'Module Ecosystem · Multi-modal support', color: 'weaviate' },
          { db: 'Milvus', lang: 'C++ / Go', note: 'GPU Acceleration · Billion-scale', color: 'milvus' },
        ].map(({ db, lang, note, color }) => (
          <div key={db} className="card group p-5">
            <div className="relative z-10 space-y-3">
              <DBBadge name={db} />
              <p className="font-mono text-slate-400">{lang}</p>
              <p className="text-slate-400">{note}</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: db === 'Milvus' ? '86%' : db === 'Weaviate' ? '79%' : '73%' }}
                  className="h-full rounded-full"
                  style={{ background: db === 'Qdrant' ? '#FB7185' : db === 'Weaviate' ? '#22D3EE' : '#34D399' }}
                />
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}
