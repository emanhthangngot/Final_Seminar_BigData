import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer
} from 'recharts'
import { recallPercentDomain } from '../../utils/benchmarkInsights'

const DB_FILL = { Qdrant: '#EF4444', Weaviate: '#3B82F6', Milvus: '#10B981' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-primary/20 bg-[#0b1024]/95 px-3 py-2 text-xs shadow-glow backdrop-blur-xl space-y-1">
      <p className="font-semibold text-gray-200">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill ?? p.stroke }}>
          {p.name}: <span className="font-mono font-bold">{(p.value * 100).toFixed(1)}%</span>
        </p>
      ))}
    </div>
  )
}

export function RecallBarChart({ data }) {
  if (!data?.length) return <EmptyChart label="Run Accuracy Benchmark to see results" />

  const chartData = [
    { k: 'Recall@1', ...Object.fromEntries(data.map((r) => [r.Engine, r['Recall@1']])) },
    { k: 'Recall@5', ...Object.fromEntries(data.map((r) => [r.Engine, r['Recall@5']])) },
    { k: 'Recall@10', ...Object.fromEntries(data.map((r) => [r.Engine, r['Recall@10']])) },
  ]
  const recallDomain = recallPercentDomain(data.flatMap((r) => [r['Recall@1'], r['Recall@5'], r['Recall@10']]))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }} barGap={4}>
        <defs>
          {Object.entries(DB_FILL).map(([db, color]) => (
            <linearGradient key={db} id={`recall-${db}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.24} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="2 10" stroke="rgba(148,163,255,0.08)" vertical={false} />
        <XAxis dataKey="k" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} domain={recallDomain} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#CBD5E1' }} />
        {Object.keys(DB_FILL).map((db) => (
          <Bar key={db} dataKey={db} fill={`url(#recall-${db})`} radius={[8, 8, 2, 2]} maxBarSize={30} animationDuration={900} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MRRRadarChart({ data }) {
  if (!data?.length) return <EmptyChart label="Run Accuracy Benchmark to see results" />

  const axes = ['Recall@1', 'Recall@5', 'Recall@10', 'MRR']
  const radarData = axes.map((ax) => ({
    subject: ax,
    ...Object.fromEntries(data.map((r) => [r.Engine, r[ax] ?? 0])),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={radarData} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
        <PolarGrid stroke="rgba(148,163,255,0.12)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#CBD5E1', fontSize: 11 }} />
        {Object.entries(DB_FILL).map(([db, color]) => (
          <Radar key={db} name={db} dataKey={db} stroke={color} strokeWidth={2} fill={color} fillOpacity={0.14} />
        ))}
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#CBD5E1' }} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

function EmptyChart({ label }) {
  return <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">{label}</div>
}
