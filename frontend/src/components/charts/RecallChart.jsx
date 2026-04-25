import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer
} from 'recharts'

const DB_FILL = { Qdrant: '#EF4444', Weaviate: '#3B82F6', Milvus: '#10B981' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs space-y-1">
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

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="k" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
        {Object.keys(DB_FILL).map((db) => (
          <Bar key={db} dataKey={db} fill={DB_FILL[db]} radius={[3, 3, 0, 0]} maxBarSize={28} />
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
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
        {Object.entries(DB_FILL).map(([db, color]) => (
          <Radar key={db} name={db} dataKey={db} stroke={color} fill={color} fillOpacity={0.12} />
        ))}
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

function EmptyChart({ label }) {
  return <div className="h-[280px] flex items-center justify-center text-gray-600 text-sm">{label}</div>
}
