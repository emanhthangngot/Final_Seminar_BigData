import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { api } from '../services/api'
import DBBadge from '../components/ui/DBBadge'
import { GitBranch, Wrench } from 'lucide-react'

export default function DXScorePage() {
  const { data: dx, isLoading } = useQuery({
    queryKey: ['dx'], queryFn: api.getDXScore,
  })

  const composite = dx
    ? Object.fromEntries(Object.entries(dx).map(([db, scores]) => [
        db,
        ['sloc', 'methods', 'cyclomatic', 'third_party_imports'].reduce((sum, key) => sum + Number(scores[key] ?? 0), 0),
      ]))
    : {}

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="card-glow p-6">
        <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/75">Developer Experience Intelligence</p>
            <h1 className="hero-title mt-2">Developer effort snapshot.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              SLOC, cyclomatic complexity, API surface, and import pressure provide a lightweight proxy for integration effort.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <Wrench size={18} className="mb-3 text-cyan" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Metric Meaning</h3>
            <div className="mt-3 space-y-2 text-sm leading-5 text-slate-400">
              <p><span className="font-mono text-cyan">sloc</span>: số dòng code cần viết để tích hợp database.</p>
              <p><span className="font-mono text-cyan">methods</span>: số hàm/API wrapper phải duy trì.</p>
              <p><span className="font-mono text-cyan">cyclomatic</span>: độ phức tạp nhánh logic trong client.</p>
              <p><span className="font-mono text-cyan">third_party_imports</span>: mức phụ thuộc thư viện ngoài.</p>
              <p><span className="font-mono text-white">Composite DX</span>: tổng proxy effort; điểm thấp hơn thường dễ tích hợp hơn.</p>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="card p-5">
          <div className="relative z-10 flex h-[220px] items-center justify-center">
            <div className="skeleton h-24 w-full max-w-2xl" />
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
