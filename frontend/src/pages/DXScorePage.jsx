import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from '../services/api'
import DBBadge from '../components/ui/DBBadge'

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300">Developer Experience Matrix</h3>
        <p className="text-xs text-gray-500">
          DX Score measures how hard each SDK is to use: SLOC + cyclomatic complexity + public method count + 3rd-party imports.
          A <span className="text-white font-semibold">lower</span> composite score = easier to work with.
        </p>
        <button className="btn-primary" disabled={isLoading} onClick={() => refetch()}>
          {isLoading ? 'Analyzing...' : 'Run DX Analyzer'}
        </button>
      </div>

      {dx && (
        <>
          <div className="card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">DX Radar</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData} margin={{ top: 8, right: 32, left: 32, bottom: 8 }}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                {Object.entries(DB_COLORS).map(([db, color]) => (
                  <Radar key={db} name={db} dataKey={db} stroke={color} fill={color} fillOpacity={0.1} />
                ))}
                <Tooltip
                  contentStyle={{ background: 'rgba(12,12,20,0.95)', border: '1px solid rgba(94,106,210,0.3)', borderRadius: 8 }}
                  labelStyle={{ color: '#eaeaea' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {Object.entries(dx).map(([db, scores]) => (
              <div key={db} className="card p-4 space-y-3">
                <DBBadge name={db} size="md" />
                <div className="space-y-1.5 font-mono text-xs">
                  {Object.entries(scores).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-gray-400">
                      <span>{k}</span>
                      <span className="text-white font-semibold">{typeof v === 'number' ? v.toFixed(1) : v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}
