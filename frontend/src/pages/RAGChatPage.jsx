import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Activity, Bot, BrainCircuit, Cpu, Database, Gauge, PanelRight, Send, Sparkles, Trash2, User } from 'lucide-react'
import DBBadge from '../components/ui/DBBadge'
import UploadPanel from '../components/ui/UploadPanel'
import { useBenchmarkStore } from '../store/benchmarkStore'
import { api } from '../services/api'

const DBS = ['Qdrant', 'Weaviate', 'Milvus']
const DB_META = {
  Qdrant: { color: 'bg-qdrant', text: 'text-qdrant', border: 'border-qdrant/25', label: 'Vector search' },
  Weaviate: { color: 'bg-weaviate', text: 'text-weaviate', border: 'border-weaviate/25', label: 'Hybrid schema' },
  Milvus: { color: 'bg-milvus', text: 'text-milvus', border: 'border-milvus/25', label: 'HNSW collection' },
}

const emptyResults = () => Object.fromEntries(DBS.map((db) => [
  db,
  { status: 'loading', answer: '', context_chunks: [], retrieval_ms: 0, generation_ms: 0, total_ms: 0, result_count: 0, error: null },
]))

const statusTone = (status) => ({
  loading: 'bg-amber-500/10 text-amber-300',
  success: 'bg-emerald-500/10 text-emerald-300',
  error: 'bg-rose-500/10 text-rose-300',
}[status] ?? 'bg-slate-500/10 text-slate-300')

function MetricBar({ label, value, max, tone = 'bg-cyan' }) {
  const width = max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-mono text-slate-500">
        <span>{label}</span>
        <span className="text-slate-300">{value?.toFixed?.(1) ?? '0.0'} ms</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function ComparisonColumn({ db, result, maxima, summary }) {
  const meta = DB_META[db]
  const isFastest = summary?.fastest_total === db

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex min-h-[360px] flex-col rounded-2xl border ${meta.border} bg-white/[0.035] p-4 shadow-card`}
    >
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <DBBadge name={db} size="sm" />
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
            <span className={`h-1.5 w-8 rounded-full ${meta.color}`} />
            {meta.label}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${statusTone(result.status)}`}>
            {result.status}
          </span>
          {isFastest && <span className="rounded-full bg-cyan/10 px-2 py-1 text-[10px] font-semibold text-cyan">fastest</span>}
        </div>
      </div>

      {result.status === 'loading' && (
        <div className="flex-1 space-y-3 py-4">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
          <div className="skeleton mt-6 h-20 w-full" />
        </div>
      )}

      {result.status === 'error' && (
        <div className="flex-1 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs leading-5 text-rose-100">
          {result.error || 'Request failed'}
        </div>
      )}

      {result.status === 'success' && (
        <>
          <div className="flex-1 whitespace-pre-wrap text-xs leading-6 text-slate-200">
            {result.answer}
          </div>
          <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
            <MetricBar label="retrieval" value={result.retrieval_ms} max={maxima.retrieval} tone={meta.color} />
            <MetricBar label="generation" value={result.generation_ms} max={maxima.generation} tone="bg-accent" />
            <MetricBar label="total" value={result.total_ms} max={maxima.total} tone="bg-cyan" />
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-[11px] text-slate-400">
              <span>retrieved chunks</span>
              <span className="font-mono text-slate-200">{result.result_count}</span>
            </div>
            {result.context_chunks?.length > 0 && (
              <div className="space-y-2">
                {result.context_chunks.map((chunk, idx) => (
                  <details key={idx} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                    <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Evidence {idx + 1}
                    </summary>
                    <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-xs leading-5 text-slate-300">{chunk}</p>
                  </details>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}

export default function RAGChatPage() {
  const { selectedDB, setSelectedDB, chatHistory, addChatMessage, clearChat } = useBenchmarkStore()
  const [input, setInput] = useState('')
  const [compareMode, setCompareMode] = useState(true)
  const [comparisonSessions, setComparisonSessions] = useState([])
  const bottomRef = useRef(null)

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 10000,
  })

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: ({ query, db }) => api.chat(query, db),
    onSuccess: (data) => addChatMessage({
      role: 'assistant',
      content: data.answer,
      db: data.db,
      latency: data.latency_ms,
      contexts: data.context_chunks ?? [],
      model: data.model,
      mockMode: data.mock_mode,
    }),
    onError: (error) => addChatMessage({
      role: 'assistant',
      content: `Real RAG request failed: ${error.message}`,
      db: selectedDB,
      error: true,
    }),
  })

  const { mutate: compareChat, isPending: isComparing } = useMutation({
    mutationFn: ({ query }) => api.compareChat(query, 5),
    onSuccess: (data, vars) => {
      setComparisonSessions((prev) => prev.map((session) => (
        session.id === vars.id
          ? { ...session, status: 'success', results: data.results, summary: data.summary, model: data.model, embeddingModel: data.embedding_model, mockMode: data.mock_mode, embeddingMs: data.embedding_ms }
          : session
      )))
    },
    onError: (error, vars) => {
      const failed = Object.fromEntries(DBS.map((db) => [
        db,
        { status: 'error', answer: '', context_chunks: [], retrieval_ms: 0, generation_ms: 0, total_ms: 0, result_count: 0, error: error.message },
      ]))
      setComparisonSessions((prev) => prev.map((session) => (
        session.id === vars.id ? { ...session, status: 'error', results: failed, summary: { success_count: 0, error_count: 3 } } : session
      )))
    },
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatHistory, comparisonSessions])

  const handleSend = () => {
    if (!input.trim() || isPending || isComparing) return
    const q = input.trim()
    setInput('')

    if (compareMode) {
      const id = Date.now()
      setComparisonSessions((prev) => [...prev, {
        id,
        query: q,
        createdAt: new Date().toISOString(),
        status: 'loading',
        results: emptyResults(),
        summary: null,
      }])
      compareChat({ id, query: q })
      return
    }

    addChatMessage({ role: 'user', content: q })
    sendMessage({ query: q, db: selectedDB })
  }

  const clearAll = () => {
    clearChat()
    setComparisonSessions([])
  }

  const latest = comparisonSessions[comparisonSessions.length - 1]
  const maxima = latest ? {
    retrieval: Math.max(...DBS.map((db) => latest.results?.[db]?.retrieval_ms ?? 0)),
    generation: Math.max(...DBS.map((db) => latest.results?.[db]?.generation_ms ?? 0)),
    total: Math.max(...DBS.map((db) => latest.results?.[db]?.total_ms ?? 0)),
  } : { retrieval: 0, generation: 0, total: 0 }

  return (
    <div className="grid h-[calc(100vh-7.25rem)] min-h-[680px] gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="card p-5">
          <div className="relative z-10 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Mode</p>
              <p className="mt-1 text-xs text-slate-500">real comparative RAG</p>
            </div>
            <PanelRight size={16} className="text-cyan" />
          </div>
          <div className="relative z-10 grid grid-cols-2 rounded-xl border border-white/10 bg-white/[0.035] p-1 text-xs">
            <button onClick={() => setCompareMode(true)} className={`rounded-lg px-3 py-2 ${compareMode ? 'bg-cyan/15 text-cyan' : 'text-slate-400'}`}>
              Compare
            </button>
            <button onClick={() => setCompareMode(false)} className={`rounded-lg px-3 py-2 ${!compareMode ? 'bg-primary/15 text-primary' : 'text-slate-400'}`}>
              Single
            </button>
          </div>
        </div>

        <div className="card p-5">
          <div className="relative z-10 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Databases</p>
              <p className="mt-1 text-xs text-slate-500">{compareMode ? 'all engines queried together' : 'single retrieval target'}</p>
            </div>
            <Database size={16} className="text-cyan" />
          </div>
          {DBS.map((db) => (
            <button
              key={db}
              onClick={() => setSelectedDB(db)}
              disabled={compareMode}
              className={`relative z-10 mb-2 w-full rounded-2xl px-3 py-3 text-left text-sm transition-all duration-150 last:mb-0 ${
                !compareMode && selectedDB === db ? 'border border-cyan/25 bg-cyan/10 shadow-glow' : 'border border-white/10 bg-white/[0.035]'
              } ${compareMode ? 'cursor-default' : 'hover:bg-white/[0.065]'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <DBBadge name={db} size="sm" />
                <span className={`h-2 w-2 rounded-full ${health?.databases?.[db] ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`h-1.5 w-10 rounded-full ${DB_META[db].color}`} />
                <span className="text-[11px] text-slate-500">{DB_META[db].label}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="card p-5">
          <div className="relative z-10 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Ollama Runtime</p>
              <p className="mt-1 text-xs text-slate-500">{health?.rag?.ollama_base_url ?? 'waiting for backend'}</p>
            </div>
            <Cpu size={16} className={health?.rag?.mock_mode ? 'text-amber-300' : 'text-emerald-300'} />
          </div>
          <div className="relative z-10 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
              <span className="text-slate-400">mode</span>
              <span className={health?.rag?.mock_mode ? 'font-semibold text-amber-300' : 'font-semibold text-emerald-300'}>
                {health?.rag?.mock_mode ? 'mock' : 'real'}
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
              <p className="text-slate-400">llm</p>
              <p className="mt-1 truncate font-mono text-slate-200">{health?.rag?.model ?? 'qwen2.5:3b'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
              <p className="text-slate-400">embedding</p>
              <p className="mt-1 truncate font-mono text-slate-200">{health?.rag?.embedding_model ?? 'nomic-embed-text'}</p>
            </div>
          </div>
        </div>

        <UploadPanel selectedDB={selectedDB} compareMode={compareMode} />
      </div>

      <div className="card flex min-w-0 flex-col overflow-hidden">
        <div className="relative z-10 flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan/20 bg-cyan/10">
              <Bot size={18} className="text-cyan" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">RAG Comparison Workspace</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                {compareMode ? 'three engines, one real request' : `single engine: ${selectedDB}`}
              </p>
            </div>
          </div>
          <button onClick={clearAll} className="btn-ghost px-3 py-2 text-xs"><Trash2 size={14} />Clear</button>
        </div>

        {compareMode && latest?.summary && (
          <div className="relative z-10 grid flex-shrink-0 gap-3 border-b border-border bg-white/[0.025] px-5 py-4 md:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">success</p>
              <p className="mt-1 font-mono text-sm text-emerald-300">{latest.summary.success_count}/3</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">fastest total</p>
              <p className="mt-1 font-mono text-sm text-cyan">{latest.summary.fastest_total ?? 'n/a'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">fastest retrieval</p>
              <p className="mt-1 font-mono text-sm text-cyan">{latest.summary.fastest_retrieval ?? 'n/a'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">query embed</p>
              <p className="mt-1 font-mono text-sm text-slate-200">{latest.embeddingMs?.toFixed?.(1) ?? '0.0'} ms</p>
            </div>
          </div>
        )}

        <div className="relative z-10 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {compareMode && comparisonSessions.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-lg text-center">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan/20 bg-cyan/10 shadow-glow"
                >
                  <BrainCircuit size={28} className="text-cyan" />
                </motion.div>
                <h2 className="font-display text-2xl font-bold text-white">Compare real RAG behavior across three vector engines.</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">Upload once into all databases, then ask once to retrieve, generate, and benchmark Qdrant, Weaviate, and Milvus side by side.</p>
              </div>
            </div>
          )}

          {compareMode && comparisonSessions.map((session) => {
            const localMaxima = {
              retrieval: Math.max(...DBS.map((db) => session.results?.[db]?.retrieval_ms ?? 0)),
              generation: Math.max(...DBS.map((db) => session.results?.[db]?.generation_ms ?? 0)),
              total: Math.max(...DBS.map((db) => session.results?.[db]?.total_ms ?? 0)),
            }
            return (
              <section key={session.id} className="space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-[92%] rounded-2xl rounded-br-md border border-primary/20 bg-primary/15 px-4 py-3 text-sm text-white shadow-card">
                    <div className="mb-2 flex items-center gap-2 text-xs text-primary">
                      <User size={13} />
                      comparative query
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{session.query}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
                  {DBS.map((db) => (
                    <ComparisonColumn
                      key={db}
                      db={db}
                      result={session.results[db]}
                      maxima={localMaxima.total > 0 ? localMaxima : maxima}
                      summary={session.summary}
                    />
                  ))}
                </div>
              </section>
            )
          })}

          {!compareMode && chatHistory.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md text-center">
                <BrainCircuit size={42} className="mx-auto mb-4 text-cyan" />
                <h2 className="font-display text-2xl font-bold text-white">Ask one selected database.</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">Single mode keeps the previous focused conversation flow.</p>
              </div>
            </div>
          )}

          {!compareMode && (
            <AnimatePresence initial={false}>
              {chatHistory.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/15">
                      <Bot size={15} className="text-accent" />
                    </div>
                  )}
                  <div className={`max-w-[78%] rounded-2xl border px-4 py-3 text-sm shadow-card ${
                    msg.role === 'user'
                      ? 'border-primary/20 bg-primary/20 text-white rounded-br-md'
                      : msg.error
                        ? 'border-rose-400/30 bg-rose-500/10 text-rose-100 rounded-bl-md'
                        : 'border-white/10 bg-white/[0.055] text-slate-200 rounded-bl-md'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.role === 'assistant' && !msg.error && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-[11px] text-slate-500">
                        {msg.db && <DBBadge name={msg.db} size="sm" />}
                        {msg.latency && <span className="font-mono">{msg.latency?.toFixed(1)} ms</span>}
                        {msg.model && <span className="font-mono">{msg.model}</span>}
                        <span className={msg.mockMode ? 'text-amber-300' : 'text-emerald-300'}>{msg.mockMode ? 'mock' : 'real'}</span>
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/15">
                      <User size={14} className="text-primary" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="relative z-10 flex-shrink-0 border-t border-border px-5 py-4">
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
            {compareMode ? <Gauge size={13} className="text-cyan" /> : <Sparkles size={13} className="text-cyan" />}
            {compareMode ? 'One request returns three answers, evidence sets, and real timing metrics.' : 'Single mode uses the selected database only.'}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={compareMode ? 'Ask all three vector databases...' : `Query your knowledge base via ${selectedDB}...`}
              className="premium-input flex-1 py-3"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isPending || isComparing}
              className="btn-primary px-4 py-3"
              aria-label="Send message"
            >
              {isComparing ? <Activity size={16} className="animate-pulse" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
