import { motion } from 'framer-motion'
import { GitMerge } from 'lucide-react'
import DBBadge from '../components/ui/DBBadge'

const NOTES = [
  { db: 'Weaviate', impl: 'collection.query.hybrid(alpha=...)', desc: 'Built-in BM25 + Vector. Tune alpha 0→1 (keyword→vector). Most ergonomic hybrid API.' },
  { db: 'Milvus', impl: 'AnnSearchRequest + RRFRanker', desc: 'Explicit sparse + dense request. Ranker: RRF or WeightedRanker. More verbose but very flexible.' },
  { db: 'Qdrant', impl: 'prefetch + late interaction', desc: 'Dense prefetch → sparse re-rank. payload filter composable into any stage.' },
]

export default function HybridPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <GitMerge size={16} className="text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300">Hybrid Search Comparison</h3>
        </div>
        <p className="text-xs text-gray-500 mb-6">
          Hybrid search combines dense vector similarity with sparse BM25 keyword matching.
          Person B (Weaviate), C (Milvus), and D (Qdrant) each implement <code className="font-mono text-primary">search_hybrid()</code> in their respective DB clients.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {NOTES.map(({ db, impl, desc }) => (
            <div key={db} className="card p-4 space-y-3">
              <DBBadge name={db} size="md" />
              <code className="block text-xs font-mono text-gray-400 bg-white/5 rounded p-2 break-all">{impl}</code>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <p className="text-xs text-gray-500">
          Chart appears here after B/C/D implement <code className="font-mono text-primary">search_hybrid()</code> and run the filtering sweep via the backend endpoint <code className="font-mono text-primary">POST /api/v1/benchmark/hybrid</code>.
        </p>
      </div>
    </motion.div>
  )
}
