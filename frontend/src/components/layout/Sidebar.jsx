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
    <aside className="w-60 flex-shrink-0 border-r border-border bg-surface-overlay backdrop-blur-xl flex flex-col">
      <div className="px-6 py-5 border-b border-border">
        <h1 className="text-lg font-bold tracking-widest uppercase text-white" style={{ textShadow: '0 0 20px rgba(94,106,210,0.6)' }}>
          VectorDB
        </h1>
        <p className="text-xs text-gray-500 mt-0.5 font-mono">Qdrant · Weaviate · Milvus</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary/20 text-white border border-primary/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-primary' : ''} />
                {label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <div className="text-xs text-gray-600 font-mono">Big Data Seminar 2024</div>
      </div>
    </aside>
  )
}
