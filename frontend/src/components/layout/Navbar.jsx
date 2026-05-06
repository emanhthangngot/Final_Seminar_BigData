import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import { useEffect, useState } from 'react'
import { Activity, Bell, Command, Menu, Search, Sparkles, UserCircle2, Wifi } from 'lucide-react'

const TITLE_MAP = {
  '/dashboard': 'Overview Dashboard',
  '/latency': 'Latency & Resources',
  '/accuracy': 'Accuracy Benchmark',
  '/tradeoff': 'Recall vs Latency',
  '/hybrid': 'Hybrid Search',
  '/dx-score': 'Developer Experience',
  '/rag-chat': 'RAG Chat Agent',
}

const DB_COLORS = { Qdrant: '#EF4444', Weaviate: '#3B82F6', Milvus: '#10B981' }

export default function Navbar() {
  const { pathname } = useLocation()
  const title = TITLE_MAP[pathname] ?? 'Dashboard'
  const [now, setNow] = useState(new Date())

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 10_000,
  })

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <header className="relative z-20 flex min-h-[84px] flex-shrink-0 items-center gap-3 px-4 pt-4 md:px-6 lg:px-8">
      <button className="btn-ghost h-11 w-11 p-0 lg:hidden" aria-label="Open navigation">
        <Menu size={18} />
      </button>
      <div className="glass-panel flex min-w-0 flex-1 items-center justify-between gap-3 rounded-3xl px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/70">Mission Control</p>
          <h2 className="truncate font-display text-lg font-semibold text-white md:text-xl">{title}</h2>
        </div>

        <div className="hidden min-w-[280px] max-w-md flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2 xl:flex">
          <Search size={16} className="text-slate-500" />
          <span className="text-sm text-slate-500">Search metrics, engines, datasets...</span>
          <span className="ml-auto flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-500">
            <Command size={11} /> K
          </span>
        </div>

        <div className="hidden items-center gap-2 2xl:flex">
          {health?.databases && Object.entries(health.databases).map(([db, ok]) => (
            <div key={db} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1.5">
              <span
                className="h-2 w-2 rounded-full shadow-[0_0_14px_currentColor]"
                style={{ backgroundColor: ok ? DB_COLORS[db] : '#64748B', color: ok ? DB_COLORS[db] : '#64748B' }}
              />
              <span className="font-mono text-[10px] text-slate-400">{db}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-2xl border border-emerald/15 bg-emerald/5 px-3 py-2 md:flex">
            <Wifi size={14} className="text-emerald" />
            <span className="font-mono text-[11px] text-emerald">sync live</span>
          </div>
          <div className="hidden rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2 font-mono text-[11px] text-slate-300 md:block">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <button className="btn-primary hidden px-3 py-2 text-xs md:inline-flex">
            <Sparkles size={14} />
            AI Recommend
          </button>
          <button className="btn-ghost h-10 w-10 p-0" aria-label="Notifications">
            <Bell size={16} />
          </button>
          <div className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.03] md:flex">
            <UserCircle2 size={20} className="text-slate-300" />
          </div>
          <Activity size={15} className="hidden text-cyan md:block" />
        </div>
      </div>
    </header>
  )
}
