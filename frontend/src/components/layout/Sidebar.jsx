import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Zap,
  Target,
  TrendingUp,
  GitMerge,
  Code2,
  MessageSquare,
  ChevronDown,
  Cpu,
  Sparkles,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/latency', icon: Zap, label: 'Latency' },
  { to: '/accuracy', icon: Target, label: 'Accuracy' },
  { to: '/tradeoff', icon: TrendingUp, label: 'Recall vs Latency' },
  { to: '/hybrid', icon: GitMerge, label: 'Hybrid Search' },
  { to: '/dx-score', icon: Code2, label: 'DX Score' },
  { to: '/rag-chat', icon: MessageSquare, label: 'RAG Chat' },
]

export default function Sidebar() {
  return (
    <aside className="relative z-20 hidden w-[292px] flex-shrink-0 p-4 pr-2 lg:flex">
      <div className="glass-panel ambient-border flex min-h-0 w-full flex-col overflow-hidden rounded-[28px]">
        <div className="relative px-6 pb-5 pt-6">
          <motion.h1
            whileHover={{ scale: 1.025 }}
            className="signature-logo text-[42px] leading-none"
          >
            VectorDB
          </motion.h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan/75">AI laboratory signature</p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.055] p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Benchmark OS</p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-500">prod-east / seminar</p>
              </div>
              <ChevronDown size={15} className="text-slate-400" />
            </div>
          </div>
        </div>

        <div className="px-4">
          <div className="relative rounded-2xl border border-emerald/15 bg-emerald/5 px-3 py-3">
            <div className="absolute left-0 top-3 h-10 w-px origin-center animate-[pulseLine_1.8s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-emerald to-transparent" />
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald" />
              </span>
              <p className="text-xs font-semibold text-emerald">AI control plane online</p>
            </div>
            <p className="mt-2 font-mono text-[10px] text-slate-500">sync 14ms · uptime 99.97%</p>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}>
              {({ isActive }) => (
                <motion.div
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.985 }}
                  className={`group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'border border-cyan/25 bg-cyan/10 text-white shadow-[0_0_26px_rgba(34,211,238,0.12)]'
                      : 'text-slate-400 hover:bg-white/[0.055] hover:text-slate-100'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-nav"
                      className="absolute inset-y-2 left-0 w-1 rounded-full bg-gradient-to-b from-cyan via-primary to-accent shadow-glow"
                    />
                  )}
                  <Icon size={18} strokeWidth={1.8} className={isActive ? 'text-cyan' : 'text-slate-500 group-hover:text-cyan'} />
                  <span>{label}</span>
                  {isActive && <Sparkles size={14} className="ml-auto text-primary" />}
                </motion.div>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Cpu size={15} className="text-cyan" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Engines</p>
            </div>
            {[
              ['Qdrant', 'bg-qdrant', 'rose'],
              ['Weaviate', 'bg-weaviate', 'cyan'],
              ['Milvus', 'bg-milvus', 'emerald'],
            ].map(([db, dot, label]) => (
              <div key={db} className="mb-2 flex items-center justify-between last:mb-0">
                <span className="flex items-center gap-2 text-xs text-slate-300"><span className={`h-2 w-2 rounded-full ${dot}`} />{db}</span>
                <span className="font-mono text-[10px] text-slate-500">{label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-slate-600">Big Data Seminar 2026</p>
        </div>
      </div>
    </aside>
  )
}
