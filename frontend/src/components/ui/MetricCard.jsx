import { motion } from 'framer-motion'

export default function MetricCard({ label, value, unit = '', trend = null, color = 'primary', insight = 'adaptive baseline stable', className = '' }) {
  const colorMap = {
    primary: 'text-primary',
    qdrant: 'text-qdrant',
    weaviate: 'text-weaviate',
    milvus: 'text-milvus',
    accent: 'text-accent',
  }
  const glowMap = {
    primary: 'from-primary/35',
    qdrant: 'from-qdrant/35',
    weaviate: 'from-weaviate/35',
    milvus: 'from-milvus/35',
    accent: 'from-accent/35',
  }

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.18 }}
      className={`card group p-5 ${className}`}
    >
      <div className={`absolute -right-10 -top-14 h-32 w-32 rounded-full bg-gradient-to-br ${glowMap[color] ?? glowMap.primary} to-transparent blur-3xl transition-opacity duration-200 group-hover:opacity-90`} />
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="metric-label">{label}</p>
          <span className={`h-2 w-2 rounded-full shadow-[0_0_16px_currentColor] ${colorMap[color] ?? 'text-primary'} bg-current`} />
        </div>
        <div className="flex items-end gap-1">
          <span className={`metric-value ${colorMap[color] ?? ''}`}>{value}</span>
          {unit && <span className="mb-1 font-mono text-sm text-slate-500">{unit}</span>}
        </div>
        <div className="mt-4 h-10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] px-2 py-1.5">
          <svg viewBox="0 0 120 28" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id={`spark-${label}`} x1="0" x2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.05" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.65" />
              </linearGradient>
            </defs>
            <motion.path
              d="M0 20 C 12 8, 20 26, 32 14 S 52 9, 62 18 80 24, 90 10 120 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={colorMap[color] ?? 'text-primary'}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.9 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </svg>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="truncate text-xs text-slate-500">{insight}</p>
          {trend !== null && (
            <p className={`font-mono text-xs ${trend >= 0 ? 'text-milvus' : 'text-qdrant'}`}>
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
