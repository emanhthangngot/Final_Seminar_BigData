import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { Send, Bot, User, BrainCircuit, PanelRight, Sparkles, Trash2 } from 'lucide-react'
import DBBadge from '../components/ui/DBBadge'
import UploadPanel from '../components/ui/UploadPanel'
import { useBenchmarkStore } from '../store/benchmarkStore'
import { api } from '../services/api'

const DBS = ['Qdrant', 'Weaviate', 'Milvus']

export default function RAGChatPage() {
  const { selectedDB, setSelectedDB, chatHistory, addChatMessage, clearChat } = useBenchmarkStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: ({ query, db }) => api.chat(query, db),
    onSuccess: (data) => addChatMessage({ role: 'assistant', content: data.answer, db: selectedDB, latency: data.latency_ms }),
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatHistory])

  const handleSend = () => {
    if (!input.trim() || isPending) return
    const q = input.trim()
    setInput('')
    addChatMessage({ role: 'user', content: q })
    sendMessage({ query: q, db: selectedDB })
  }

  return (
    <div className="grid h-[calc(100vh-7.25rem)] min-h-[640px] gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="card p-5">
          <div className="relative z-10 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Active Database</p>
              <p className="mt-1 text-xs text-slate-500">retrieval target</p>
            </div>
            <PanelRight size={16} className="text-cyan" />
          </div>
          {DBS.map((db) => (
            <button
              key={db}
              onClick={() => setSelectedDB(db)}
              className={`relative z-10 mb-2 w-full rounded-2xl px-3 py-3 text-left text-sm transition-all duration-150 last:mb-0 ${
                selectedDB === db ? 'border border-cyan/25 bg-cyan/10 shadow-glow' : 'border border-white/10 bg-white/[0.035] hover:bg-white/[0.065]'
              }`}
            >
              <DBBadge name={db} size="sm" />
            </button>
          ))}
        </div>
        <UploadPanel selectedDB={selectedDB} />
      </div>

      <div className="card flex min-w-0 flex-col overflow-hidden">
        <div className="relative z-10 flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan/20 bg-cyan/10">
              <Bot size={18} className="text-cyan" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">RAG Intelligence Workspace</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">streaming retrieval agent</p>
            </div>
            <DBBadge name={selectedDB} size="sm" />
          </div>
          <button onClick={clearChat} className="btn-ghost px-3 py-2 text-xs"><Trash2 size={14} />Clear</button>
        </div>

        <div className="relative z-10 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {chatHistory.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md text-center">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan/20 bg-cyan/10 shadow-glow"
                >
                  <BrainCircuit size={28} className="text-cyan" />
                </motion.div>
                <h2 className="font-display text-2xl font-bold text-white">Ask the benchmark knowledge base.</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">Upload a PDF, ingest it into the active vector engine, then query with citations and retrieval latency.</p>
              </div>
            </div>
          )}
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
                    : 'border-white/10 bg-white/[0.055] text-slate-200 rounded-bl-md'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  {msg.latency && (
                    <p className="mt-2 font-mono text-xs text-slate-500">{msg.latency?.toFixed(1)} ms</p>
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
          {isPending && (
            <div className="flex gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-accent/20 bg-accent/15">
                <Bot size={14} className="text-accent" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.055] px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="relative z-10 flex-shrink-0 border-t border-border px-5 py-4">
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
            <Sparkles size={13} className="text-cyan" />
            Markdown, code snippets, and retrieval latency are rendered in the conversation stream.
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`Query your knowledge base via ${selectedDB}...`}
              className="premium-input flex-1 py-3"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isPending}
              className="btn-primary px-4 py-3"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
