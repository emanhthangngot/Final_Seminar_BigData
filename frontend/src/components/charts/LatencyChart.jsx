import {
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'

const DB_FILL = { Qdrant: '#EF4444', Weaviate: '#3B82F6', Milvus: '#10B981' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-cyan/20 bg-[#0b1024]/95 px-3 py-2 text-xs shadow-glow backdrop-blur-xl space-y-1">
      <p className="font-semibold text-gray-200">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill ?? p.stroke }}>
          {p.name}: <span className="font-mono font-semibold">{p.value?.toFixed(2)} ms</span>
        </p>
      ))}
    </div>
  )
}

export function LatencyBarChart({ data, dbs = Object.keys(DB_FILL), height = 280 }) {
  if (!data?.length) return <EmptyChart label="No latency data yet" />

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }} barGap={4}>
        <defs>
          {Object.entries(DB_FILL).map(([db, color]) => (
            <linearGradient key={db} id={`bar-${db}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={color} stopOpacity={0.28} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="2 10" stroke="rgba(148,163,255,0.08)" vertical={false} />
        <XAxis dataKey="operation" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} unit=" ms" />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#CBD5E1' }} />
        {dbs.map((db) => (
          <Bar key={db} dataKey={db} fill={`url(#bar-${db})`} radius={[8, 8, 2, 2]} maxBarSize={34} animationDuration={850} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LatencyTimelineChart({ data, dbs = Object.keys(DB_FILL) }) {
  if (!data?.length) return <EmptyChart label="No timeline data yet" />

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <defs>
          {Object.entries(DB_FILL).map(([db, color]) => (
            <linearGradient key={db} id={`area-${db}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="90%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="2 10" stroke="rgba(148,163,255,0.08)" vertical={false} />
        <XAxis dataKey="ts" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} unit="ms" />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#CBD5E1' }} />
        {dbs.map((db) => (
          <Area
            key={db}
            type="monotone"
            dataKey={db}
            stroke={DB_FILL[db]}
            fill={`url(#area-${db})`}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#0B1024' }}
            animationDuration={900}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

function EmptyChart({ label }) {
  return (
    <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">{label}</div>
  )
}
