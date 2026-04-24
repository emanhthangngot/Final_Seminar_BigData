const DB_COLORS = {
  Qdrant:   { text: 'text-qdrant',   bg: 'bg-qdrant/10',   border: 'border-qdrant/30' },
  Weaviate: { text: 'text-weaviate', bg: 'bg-weaviate/10', border: 'border-weaviate/30' },
  Milvus:   { text: 'text-milvus',   bg: 'bg-milvus/10',   border: 'border-milvus/30' },
}

export default function DBBadge({ name, size = 'sm' }) {
  const c = DB_COLORS[name] ?? { text: 'text-gray-300', bg: 'bg-white/5', border: 'border-white/10' }
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded font-mono font-medium border ${c.text} ${c.bg} ${c.border} ${pad}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.text.replace('text-', 'bg-')}`} />
      {name}
    </span>
  )
}
