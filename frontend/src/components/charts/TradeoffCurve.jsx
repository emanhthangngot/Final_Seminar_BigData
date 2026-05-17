import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts'
import { recallPercentDomain } from '../../utils/benchmarkInsights'

const DB_COLORS = { Qdrant: '#EF4444', Weaviate: '#3B82F6', Milvus: '#10B981' }

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-2xl border border-cyan/20 bg-[#0b1024]/95 px-3 py-2 text-xs shadow-glow backdrop-blur-xl space-y-1">
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
      <div className="h-[340px] flex items-center justify-center text-gray-400 text-sm">
        Run Tradeoff Sweep to see the Recall vs Latency Pareto curve
      </div>
    )
  }

  const byDB = Object.entries(DB_COLORS).map(([db, color]) => ({
    db,
    color,
    points: data.filter((r) => r.Engine === db).sort((a, b) => a.AvgLatency_ms - b.AvgLatency_ms),
  }))
  const recallDomain = recallPercentDomain(data.map((row) => row.Recall))

  return (
    <div>
      <p className="mb-3 text-sm text-slate-400">
        The highlighted frontier exposes the best operational tradeoff: highest recall at the lowest observed latency.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 8, right: 24, left: -8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="2 10" stroke="rgba(148,163,255,0.08)" />
          <XAxis
            type="number" dataKey="AvgLatency_ms" name="Latency (ms)"
            tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false}
            label={{ value: 'Avg Latency (ms)', position: 'insideBottomRight', offset: -4, fill: '#64748B', fontSize: 10 }}
          />
          <YAxis
            type="number" dataKey="Recall" name="Recall" domain={recallDomain}
            tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#CBD5E1' }} />
          {byDB.map(({ db, color, points }) => (
            <Scatter
              key={db}
              name={db}
              data={points}
              fill={color}
              stroke={color}
              line={{ stroke: color, strokeWidth: 2.5, strokeOpacity: 0.65 }}
              lineType="joint"
            >
              <LabelList dataKey="top_k" position="top" fill="#CBD5E1" fontSize={10} />
            </Scatter>
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
