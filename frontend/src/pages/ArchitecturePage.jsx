import { motion } from 'framer-motion'

const ENGINES = [
  {
    name: 'Qdrant',
    label: 'The Payload-first Engine',
    language: 'Rust',
    accent: 'qdrant',
    tone: 'rose',
    philosophy: 'Couple vectors and payload metadata tightly so semantic search and rich filtering happen in one efficient retrieval path.',
    strength: 'Fast filtered vector search, operational simplicity, and predictable behavior for metadata-heavy RAG workloads.',
    useCase: 'Tenant-aware RAG, ACL filtering, faceted retrieval, and applications where every query carries strict payload constraints.',
    distributed: 'Clustered shards and replicas, but the core advantage is the local payload-aware search path.',
  },
  {
    name: 'Weaviate',
    label: 'The Schema-driven Engine',
    language: 'Go',
    accent: 'weaviate',
    tone: 'cyan',
    philosophy: 'Model data through classes/properties, then query with vector and lexical indexes as first-class parallel primitives.',
    strength: 'Native hybrid retrieval that blends BM25 keyword evidence with HNSW semantic similarity.',
    useCase: 'Knowledge bases where exact terms, acronyms, product codes, and semantic context must be fused in one ranking.',
    distributed: 'Horizontally scalable cluster model with sharding and replication around schema-defined collections.',
  },
  {
    name: 'Milvus',
    label: 'The Distributed Behemoth',
    language: 'Go / C++',
    accent: 'milvus',
    tone: 'emerald',
    philosophy: 'Separate access, coordination, compute, and shared storage so each layer can scale independently.',
    strength: 'Cloud-native throughput and capacity for very large vector collections and high-concurrency retrieval.',
    useCase: 'Billion-level vector RAG, multi-collection platforms, offline ingestion at scale, and production retrieval services.',
    distributed: 'True shared-storage architecture with coordinators, stateless-ish workers, and object storage decoupled from compute.',
  },
]

const COMPARISON = [
  ['Core Language', 'Rust', 'Go', 'Go / C++'],
  ['Design Philosophy', 'Payload-first vector retrieval', 'Schema-first hybrid retrieval', 'Cloud-native distributed retrieval'],
  ['Distributed Architecture', 'Shards and replicas around payload-aware segments', 'Clustered classes with sharding and replication', 'Separated access, coordinators, workers, and shared object storage'],
  ['Why it wins', 'Complex filters plus vector search stay inside one efficient payload-aware path.', 'BM25 and vector search run as native parallel lanes before fusion.', 'Access, coordination, compute, and storage scale as separate layers.'],
  ['Best RAG fit', 'Filtered enterprise RAG with metadata, tenants, permissions, and facets.', 'Hybrid RAG where keyword precision and semantic recall both matter.', 'Billion-scale RAG platforms with independent ingest and query scaling.'],
  ['Choose when', 'Metadata filters are not optional; they are the query contract.', 'Lexical precision and semantic recall must be blended without bolting on a separate search stack.', 'Scale, ingestion volume, and independent compute expansion dominate the architecture.'],
]

const FADE_UP = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }
const ACCENT_CLASSES = {
  qdrant: {
    text: 'text-qdrant',
    border: 'border-qdrant/20',
    borderStrong: 'border-qdrant/25',
    bg: 'bg-qdrant/10',
  },
  weaviate: {
    text: 'text-weaviate',
    border: 'border-weaviate/20',
    borderStrong: 'border-weaviate/25',
    bg: 'bg-weaviate/10',
  },
  milvus: {
    text: 'text-milvus',
    border: 'border-milvus/20',
    borderStrong: 'border-milvus/25',
    bg: 'bg-milvus/10',
  },
  cyan: {
    text: 'text-cyan',
    border: 'border-cyan/20',
    borderStrong: 'border-cyan/25',
    bg: 'bg-cyan/10',
  },
}

const SVG_COLORS = {
  qdrant: { stroke: '#FB7185', fill: 'rgba(251,113,133,0.11)', soft: 'rgba(251,113,133,0.2)' },
  weaviate: { stroke: '#22D3EE', fill: 'rgba(34,211,238,0.11)', soft: 'rgba(34,211,238,0.2)' },
  milvus: { stroke: '#34D399', fill: 'rgba(52,211,153,0.11)', soft: 'rgba(52,211,153,0.2)' },
}

function DiagramDefs({ id, accent }) {
  const color = SVG_COLORS[accent]
  return (
    <defs>
      <marker id={`${id}-arrow`} markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
        <path d="M0,0 L8,4 L0,8 Z" fill={color.stroke} />
      </marker>
      <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.2" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.35 0 0 0 0 0.75 0 0 0 0 1 0 0 0 .3 0" />
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  )
}

function SvgNode({ x, y, w, h, title, sub, detail, accent, strong = false }) {
  const nx = Number(x)
  const ny = Number(y)
  const nw = Number(w)
  const nh = Number(h)
  const color = SVG_COLORS[accent]

  const hasSub = Boolean(sub)
  const hasDetail = Boolean(detail)
  
  let titleY, subY, detailY
  
  if (hasSub && hasDetail) {
    const first = ny + 15
    const last = ny + nh - 9
    const step = (last - first) / 2
    titleY = first
    subY = first + step
    detailY = last
  } else if (hasSub) {
    const first = ny + 17
    const last = ny + nh - 11
    titleY = first
    subY = last
  } else {
    titleY = ny + nh / 2 + 4
  }

  return (
    <g>
      <rect
        x={nx}
        y={ny}
        width={nw}
        height={nh}
        rx="14"
        fill={strong ? color.fill : 'rgba(255,255,255,0.045)'}
        stroke={strong ? color.stroke : 'rgba(255,255,255,0.14)'}
        strokeWidth={strong ? 1.6 : 1}
      />
      <text x={nx + nw / 2} y={titleY} textAnchor="middle" fill="#F8FAFC" fontSize={nw < 125 ? '11.5' : '13'} fontWeight="700">
        {title}
      </text>
      {sub && (
        <text x={nx + nw / 2} y={subY} textAnchor="middle" fill="#94A3B8" fontSize={nw < 125 ? '8.5' : '10'} fontFamily="monospace">
          {sub}
        </text>
      )}
      {detail && (
        <text x={nx + nw / 2} y={detailY} textAnchor="middle" fill={color.stroke} fontSize={nw < 125 ? '8' : '9'} fontFamily="monospace" fontWeight="700">
          {detail}
        </text>
      )}
    </g>
  )
}

function SvgPill({ x, y, text, accent, w = 112 }) {
  const nx = Number(x)
  const ny = Number(y)
  const nw = Number(w)
  const color = SVG_COLORS[accent]
  return (
    <g>
      <rect x={nx} y={ny} width={nw} height="22" rx="11" fill="#081426" stroke={color.stroke} strokeOpacity="0.75" />
      <text x={nx + nw / 2} y={ny + 14.5} textAnchor="middle" fill={color.stroke} fontSize="8.5" fontFamily="monospace" fontWeight="700">
        {text}
      </text>
    </g>
  )
}

function QdrantDiagram() {
  return (
    <svg className="h-[410px] w-full" viewBox="0 0 420 410" role="img" aria-label="Qdrant payload-first architecture topology">
      <DiagramDefs id="qdrant" accent="qdrant" />
      <rect x="14" y="14" width="392" height="382" rx="22" fill="rgba(251,113,133,0.045)" stroke="rgba(251,113,133,0.2)" />
      <SvgNode x="108" y="30" w="204" h="62" title="Query + Filter" sub="embedding + payload filter" detail="tenant / ACL / timestamp" accent="qdrant" strong />
      <path d="M210 92 V124" stroke="#FB7185" strokeWidth="2.5" markerEnd="url(#qdrant-arrow)" filter="url(#qdrant-glow)" />
      <SvgPill x="158" y="102" w="104" text="single pass" accent="qdrant" />
      <rect x="48" y="132" width="324" height="148" rx="20" fill="rgba(251,113,133,0.08)" stroke="#FB7185" strokeOpacity="0.65" strokeWidth="1.5" />
      <text x="210" y="156" textAnchor="middle" fill="#F8FAFC" fontSize="14" fontWeight="800">Unified Segment</text>
      <text x="210" y="176" textAnchor="middle" fill="#FDA4AF" fontSize="9.5" fontFamily="monospace">payload storage coupled with HNSW</text>
      <SvgNode x="70" y="206" w="126" h="56" title="Payload Index" sub="metadata pruning" detail="filter first" accent="qdrant" />
      <SvgNode x="224" y="206" w="126" h="56" title="Vector HNSW" sub="nearest graph" detail="same segment" accent="qdrant" />
      <path d="M133 206 C133 190 176 190 176 206" stroke="#FB7185" strokeWidth="1.8" fill="none" />
      <path d="M287 206 C287 190 244 190 244 206" stroke="#FB7185" strokeWidth="1.8" fill="none" />
      <path d="M210 280 V316" stroke="#FB7185" strokeWidth="2.5" markerEnd="url(#qdrant-arrow)" filter="url(#qdrant-glow)" />
      <SvgPill x="158" y="291" w="104" text="ranked top-k" accent="qdrant" />
      <SvgNode x="110" y="324" w="200" h="50" title="Filtered Results" sub="constrained top-k" detail="low latency" accent="qdrant" strong />
    </svg>
  )
}

function WeaviateDiagram() {
  return (
    <svg className="h-[410px] w-full" viewBox="0 0 420 410" role="img" aria-label="Weaviate schema-driven parallel architecture topology">
      <DiagramDefs id="weaviate" accent="weaviate" />
      <rect x="14" y="14" width="392" height="382" rx="22" fill="rgba(34,211,238,0.045)" stroke="rgba(34,211,238,0.2)" />
      <SvgNode x="110" y="28" w="200" h="64" title="Schema Query" sub="class + properties + vector" detail="schema-first routing" accent="weaviate" strong />
      <path d="M210 92 V130 M210 130 C130 130 94 136 94 158 M210 130 C290 130 326 136 326 158" stroke="#22D3EE" strokeWidth="2.5" fill="none" markerEnd="url(#weaviate-arrow)" filter="url(#weaviate-glow)" />
      <SvgPill x="50" y="104" w="98" text="lexical path" accent="weaviate" />
      <SvgPill x="272" y="104" w="98" text="semantic path" accent="weaviate" />
      <rect x="42" y="158" width="130" height="112" rx="18" fill="rgba(34,211,238,0.08)" stroke="#22D3EE" strokeOpacity="0.62" />
      <rect x="248" y="158" width="130" height="112" rx="18" fill="rgba(34,211,238,0.08)" stroke="#22D3EE" strokeOpacity="0.62" />
      <SvgNode x="54" y="176" w="106" h="58" title="Inverted" sub="keyword / BM25" detail="exact terms" accent="weaviate" />
      <SvgNode x="260" y="176" w="106" h="58" title="Vector HNSW" sub="semantic ANN" detail="similar chunks" accent="weaviate" />
      <text x="107" y="254" textAnchor="middle" fill="#67E8F9" fontSize="8.5" fontFamily="monospace">keyword evidence</text>
      <text x="313" y="254" textAnchor="middle" fill="#67E8F9" fontSize="8.5" fontFamily="monospace">semantic evidence</text>
      <path d="M107 270 C107 298 162 304 190 318 M313 270 C313 298 258 304 230 318" stroke="#22D3EE" strokeWidth="2.5" fill="none" markerEnd="url(#weaviate-arrow)" filter="url(#weaviate-glow)" />
      <SvgPill x="160" y="282" w="100" text="score fusion" accent="weaviate" />
      <SvgNode x="105" y="326" w="210" h="50" title="Hybrid Search / Fusion" sub="BM25 + vector normalization" detail="blended final ranking" accent="weaviate" strong />
    </svg>
  )
}

function MilvusDiagram() {
  return (
    <svg className="h-[410px] w-full" viewBox="0 0 420 410" role="img" aria-label="Milvus distributed shared-storage architecture topology">
      <DiagramDefs id="milvus" accent="milvus" />
      <rect x="14" y="14" width="392" height="382" rx="22" fill="rgba(52,211,153,0.045)" stroke="rgba(52,211,153,0.2)" />
      <SvgNode x="110" y="28" w="200" h="54" title="Access Layer" sub="SDK / REST / Proxy" detail="client entrypoint" accent="milvus" strong />
      <path d="M210 82 V108" stroke="#34D399" strokeWidth="2.5" markerEnd="url(#milvus-arrow)" filter="url(#milvus-glow)" />
      <SvgPill x="164" y="88" w="92" text="route" accent="milvus" />
      <SvgNode x="88" y="116" w="244" h="60" title="Coordinator Services" sub="root / query / data / index" detail="cluster scheduling" accent="milvus" strong />
      <path d="M210 176 V208 M210 208 C138 208 108 212 108 232 M210 208 C282 208 312 212 312 232" stroke="#34D399" strokeWidth="2.5" fill="none" markerEnd="url(#milvus-arrow)" filter="url(#milvus-glow)" />
      <SvgPill x="158" y="186" w="104" text="scale compute" accent="milvus" />
      <SvgNode x="48" y="232" w="124" h="58" title="Query Nodes" sub="search workers" detail="read segments" accent="milvus" />
      <SvgNode x="248" y="232" w="124" h="58" title="Data Nodes" sub="ingest workers" detail="write logs" accent="milvus" />
      <path d="M110 290 C110 312 160 318 190 326 M310 290 C310 312 260 318 230 326" stroke="#34D399" strokeWidth="2.5" fill="none" markerEnd="url(#milvus-arrow)" filter="url(#milvus-glow)" />
      <SvgNode x="88" y="326" w="244" h="48" title="Shared Object Storage" sub="segments + index artifacts" detail="compute decoupled" accent="milvus" strong />
    </svg>
  )
}

function EngineCard({ engine }) {
  const Diagram = engine.name === 'Qdrant' ? QdrantDiagram : engine.name === 'Weaviate' ? WeaviateDiagram : MilvusDiagram
  const color = ACCENT_CLASSES[engine.accent]

  return (
    <motion.article variants={FADE_UP} className="card p-5">
      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className={`font-mono text-[10px] uppercase tracking-[0.24em] ${color.text}`}>{engine.label}</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-white">{engine.name}</h2>
            </div>
            <span className={`rounded-full border ${color.borderStrong} ${color.bg} px-3 py-1 font-mono text-[11px] ${color.text}`}>
              {engine.language}
            </span>
          </div>
          <p className="text-sm leading-6 text-slate-400">{engine.philosophy}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#071022]/70 p-4">
          <Diagram />
        </div>
      </div>
    </motion.article>
  )
}

export default function ArchitecturePage() {
  return (
    <motion.div variants={{ show: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show" className="space-y-5">
      <motion.section variants={FADE_UP} className="card-glow p-6">
        <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">Architecture</span>
              <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-400">Topology comparison</span>
            </div>
            <h1 className="hero-title max-w-5xl">Explain why each vector database wins in different RAG scenarios.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
              This page compares Qdrant, Weaviate, and Milvus at the architectural level: where query work happens, how indexes cooperate, and why each design maps to a different production retrieval profile.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {ENGINES.map((engine) => (
              <div key={engine.name} className={`rounded-2xl border ${ACCENT_CLASSES[engine.accent].border} ${ACCENT_CLASSES[engine.accent].bg} p-4`}>
                <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${ACCENT_CLASSES[engine.accent].text}`}>{engine.name}</p>
                <p className="mt-2 text-sm font-semibold text-white">{engine.label.replace('The ', '')}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{engine.language}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="grid gap-5 xl:grid-cols-3">
        {ENGINES.map((engine) => (
          <EngineCard key={engine.name} engine={engine} />
        ))}
      </section>

      <motion.section variants={FADE_UP} className="card p-5">
        <div className="relative z-10">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary-light">Decision matrix</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-white">Architecture-to-RAG comparison</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-400">
              Read horizontally to see how the same criterion changes when the engine optimizes for filtering, hybrid retrieval, or distributed scale.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-[980px] w-full border-collapse text-left text-sm">
              <thead className="bg-white/[0.055]">
                <tr>
                  <th className="w-[190px] px-4 py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Criterion</th>
                  {ENGINES.map((engine) => (
                    <th key={engine.name} className="px-4 py-4">
                      <span className={`font-display text-base font-bold ${ACCENT_CLASSES[engine.accent].text}`}>{engine.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([criterion, qdrant, weaviate, milvus]) => (
                  <tr key={criterion} className="border-t border-white/10 align-top">
                    <th className="px-4 py-4 font-semibold text-white">{criterion}</th>
                    <td className="px-4 py-4 leading-6 text-slate-300">{qdrant}</td>
                    <td className="px-4 py-4 leading-6 text-slate-300">{weaviate}</td>
                    <td className="px-4 py-4 leading-6 text-slate-300">{milvus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.section>

    </motion.div>
  )
}
