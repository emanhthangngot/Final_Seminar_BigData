import { Suspense, lazy } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import MetricCard from '../components/ui/MetricCard'
import DBBadge from '../components/ui/DBBadge'
import { api } from '../services/api'

const VectorSpaceScene = lazy(() => import('../components/three/VectorSpaceScene'))

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

  return (
    <motion.div variants={{ show: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show" className="space-y-6">

      {/* Hero 3D Scene */}
      <motion.div variants={FADE_UP} className="card overflow-hidden" style={{ height: 320 }}>
        <Suspense fallback={<div className="h-full skeleton" />}>
          <VectorSpaceScene />
        </Suspense>
        <div className="absolute top-4 left-6 pointer-events-none">
          <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Vector Space — 3D Preview</p>
        </div>
      </motion.div>

      {/* DB Status Grid */}
      <motion.div variants={FADE_UP} className="grid grid-cols-3 gap-4">
        {dbs.map((db) => (
          <div key={db} className="card p-4 flex items-center justify-between">
            <DBBadge name={db} size="md" />
            <span className={`text-xs font-mono ${health?.databases?.[db] ? 'text-milvus' : 'text-gray-600'}`}>
              {health?.databases?.[db] ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Latency Summary */}
      <motion.div variants={FADE_UP} className="grid grid-cols-3 gap-4">
        <MetricCard label="Qdrant Avg Search" value={avgLatency('Qdrant')} unit="ms" color="qdrant" />
        <MetricCard label="Weaviate Avg Search" value={avgLatency('Weaviate')} unit="ms" color="weaviate" />
        <MetricCard label="Milvus Avg Search" value={avgLatency('Milvus')} unit="ms" color="milvus" />
      </motion.div>

      {/* Info Cards */}
      <motion.div variants={FADE_UP} className="grid grid-cols-3 gap-4 text-xs">
        {[
          { db: 'Qdrant', lang: 'Rust', note: 'Binary Quantization · Zero-cost memory', color: 'qdrant' },
          { db: 'Weaviate', lang: 'Go', note: 'Module Ecosystem · Multi-modal support', color: 'weaviate' },
          { db: 'Milvus', lang: 'C++ / Go', note: 'GPU Acceleration · Billion-scale', color: 'milvus' },
        ].map(({ db, lang, note, color }) => (
          <div key={db} className="card p-4 space-y-2">
            <DBBadge name={db} />
            <p className="font-mono text-gray-400">{lang}</p>
            <p className="text-gray-500">{note}</p>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}
