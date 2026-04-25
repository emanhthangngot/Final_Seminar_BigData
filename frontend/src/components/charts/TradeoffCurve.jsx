import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Line, ComposedChart
} from 'recharts'

const DB_COLORS = { Qdrant: '#EF4444', Weaviate: '#3B82F6', Milvus: '#10B981' }

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="card px-3 py-2 text-xs space-y-1">
      <p className="font-semibold" style={{ color: DB_COLORS[d.Engine] }}>{d.Engine}</p>
      <p className="text-gray-300">top_k = <span className="font-mono font-bold">{d.top_k}</span></p>
      <p className="text-gray-300">Recall = <span className="font-mono font-bold">{(d.Recall * 100).toFixed(1)}%</span></p>
      <p className="text-gray-300">Latency = <span className="font-mono font-bold">{d.AvgLatency_ms?.toFixed(1)} ms</span></p>
    </div>
  )
}

export default function TradeoffCurve({ data }) {
  if (!data?.length) {
    return (
      <div className="h-[340px] flex items-center justify-center text-gray-600 text-sm">
        Run Tradeoff Sweep to see the Recall vs Latency Pareto curve
      </div>
    )
  }

  const byDB = Object.entries(DB_COLORS).map(([db, color]) => ({
    db,
    color,
    points: data.filter((r) => r.Engine === db).sort((a, b) => a.AvgLatency_ms - b.AvgLatency_ms),
  }))

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Points toward the <span className="text-white font-semibold">top-left</span> are best — higher Recall, lower Latency.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 8, right: 24, left: -8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            type="number" dataKey="AvgLatency_ms" name="Latency (ms)"
            tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false}
            label={{ value: 'Avg Latency (ms)', position: 'insideBottomRight', offset: -4, fill: '#6B7280', fontSize: 10 }}
          />
          <YAxis
            type="number" dataKey="Recall" name="Recall" domain={[0, 1]}
            tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
          {byDB.map(({ db, color, points }) => (
            <Scatter key={db} name={db} data={points} fill={color} stroke={color} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
