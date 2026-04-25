import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Activity } from 'lucide-react'

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

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 10_000,
  })

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 flex-shrink-0 bg-surface-overlay backdrop-blur-xl">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-200">
        {title}
      </h2>

      <div className="flex items-center gap-4">
        {health?.databases && Object.entries(health.databases).map(([db, ok]) => (
          <div key={db} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: ok ? DB_COLORS[db] : '#6B7280' }}
            />
            <span className="text-xs text-gray-400 font-mono">{db}</span>
          </div>
        ))}
        <Activity size={14} className="text-gray-500" />
      </div>
    </header>
  )
}
