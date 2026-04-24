import {
  BarChart, Bar, BoxPlot, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'

const DB_FILL = { Qdrant: '#EF4444', Weaviate: '#3B82F6', Milvus: '#10B981' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-gray-200">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }}>
          {p.name}: <span className="font-mono font-semibold">{p.value?.toFixed(2)} ms</span>
        </p>
      ))}
    </div>
  )
}

export function LatencyBarChart({ data }) {
  if (!data?.length) return <EmptyChart label="No latency data yet" />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="operation" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} unit=" ms" />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
        {Object.keys(DB_FILL).map((db) => (
          <Bar key={db} dataKey={db} fill={DB_FILL[db]} radius={[3, 3, 0, 0]} maxBarSize={32} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LatencyTimelineChart({ data }) {
  if (!data?.length) return <EmptyChart label="No timeline data yet" />

  const { LineChart, Line } = require('recharts')

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="ts" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} unit="ms" />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
        {Object.entries(DB_FILL).map(([db, color]) => (
          <Line key={db} type="monotone" dataKey={db} stroke={color} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

function EmptyChart({ label }) {
  return (
    <div className="h-[280px] flex items-center justify-center text-gray-600 text-sm">{label}</div>
  )
}
