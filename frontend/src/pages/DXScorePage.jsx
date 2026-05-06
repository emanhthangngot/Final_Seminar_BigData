import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from '../services/api'
import DBBadge from '../components/ui/DBBadge'
import { Code2, GitBranch, Network, Play, Wrench } from 'lucide-react'

const DB_COLORS = { Qdrant: '#EF4444', Weaviate: '#3B82F6', Milvus: '#10B981' }

export default function DXScorePage() {
  const { data: dx, isLoading, refetch } = useQuery({
    queryKey: ['dx'], queryFn: api.getDXScore, enabled: false,
  })

  const radarData = dx
    ? ['sloc', 'methods', 'cyclomatic', 'third_party_imports'].map((ax) => ({
        subject: ax,
        ...Object.fromEntries(Object.entries(dx).map(([db, v]) => [db, v[ax] ?? 0])),
      }))
    : []
  const composite = dx
    ? Object.fromEntries(Object.entries(dx).map(([db, scores]) => [
        db,
        ['sloc', 'methods', 'cyclomatic', 'third_party_imports'].reduce((sum, key) => sum + Number(scores[key] ?? 0), 0),
      ]))
    : {}

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="card-glow p-6">
        <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/75">Developer Experience Intelligence</p>
            <h1 className="hero-title mt-2">SDK complexity, maintainability, and ecosystem posture.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              SLOC, cyclomatic complexity, API surface, and import pressure become a readable engineering intelligence layer.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <Wrench size={18} className="mb-3 text-cyan" />
            <p className="text-sm text-slate-400">Lower composite score indicates an easier integration path.</p>
        <button className="btn-primary" disabled={isLoading} onClick={() => refetch()}>
          <Play size={15} />
          {isLoading ? 'Analyzing...' : 'Run DX Analyzer'}
        </button>
          </div>
        </div>
      </div>

      {!dx && (
        <div className="card p-5">
          <div className="relative z-10 flex h-[220px] items-center justify-center text-sm text-slate-400">
            Run the analyzer to compare implementation size, complexity, API surface, and dependencies.
          </div>
        </div>
      )}

      {dx && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Object.entries(composite).map(([db, score]) => (
              <div key={db} className="card p-4 space-y-2">
                <div className="relative z-10">
                  <DBBadge name={db} size="md" />
                  <p className="metric-label mt-4">Composite DX</p>
                  <p className="metric-value">{score.toFixed(1)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <div className="relative z-10 mb-4 flex items-center gap-2">
              <Network size={16} className="text-cyan" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">DX Radar</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData} margin={{ top: 8, right: 32, left: 32, bottom: 8 }}>
                <PolarGrid stroke="rgba(148,163,255,0.12)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#CBD5E1', fontSize: 11 }} />
                {Object.entries(DB_COLORS).map(([db, color]) => (
                  <Radar key={db} name={db} dataKey={db} stroke={color} strokeWidth={2} fill={color} fillOpacity={0.13} />
                ))}
                <Tooltip
                  contentStyle={{ background: 'rgba(12,12,20,0.95)', border: '1px solid rgba(94,106,210,0.3)', borderRadius: 8 }}
                  labelStyle={{ color: '#eaeaea' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Object.entries(dx).map(([db, scores]) => (
              <div key={db} className="card p-4 space-y-3">
                <div className="relative z-10">
                  <div className="mb-4 flex items-center justify-between">
                    <DBBadge name={db} size="md" />
                    <GitBranch size={15} className="text-slate-500" />
                  </div>
                <div className="space-y-1.5 font-mono text-xs">
                  {Object.entries(scores).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-gray-400">
                      <span>{k}</span>
                      <span className="text-white font-semibold">{typeof v === 'number' ? v.toFixed(1) : v}</span>
                    </div>
                  ))}
                </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}
