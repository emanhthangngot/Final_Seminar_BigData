import { motion } from 'framer-motion'

export default function MetricCard({ label, value, unit = '', trend = null, color = 'primary', className = '' }) {
  const colorMap = {
    primary: 'text-primary',
    qdrant: 'text-qdrant',
    weaviate: 'text-weaviate',
    milvus: 'text-milvus',
    accent: 'text-accent',
  }

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(94,106,210,0.2)' }}
      transition={{ duration: 0.15 }}
      className={`card p-4 ${className}`}
    >
      <p className="metric-label mb-2">{label}</p>
      <div className="flex items-end gap-1">
        <span className={`metric-value ${colorMap[color] ?? ''}`}>{value}</span>
        {unit && <span className="text-gray-500 text-sm mb-0.5 font-mono">{unit}</span>}
      </div>
      {trend !== null && (
        <p className={`text-xs mt-1 font-mono ${trend >= 0 ? 'text-milvus' : 'text-qdrant'}`}>
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
        </p>
      )}
    </motion.div>
  )
}
