import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { Send, Bot, User } from 'lucide-react'
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
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-60 flex-shrink-0 space-y-4">
        <div className="card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Active Database</p>
          {DBS.map((db) => (
            <button
              key={db}
              onClick={() => setSelectedDB(db)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                selectedDB === db ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5'
              }`}
            >
              <DBBadge name={db} size="sm" />
            </button>
          ))}
        </div>
        <UploadPanel selectedDB={selectedDB} />
      </div>

      {/* Chat Area */}
      <div className="flex-1 card flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-primary" />
            <span className="text-sm font-semibold text-gray-200">RAG Agent</span>
            <DBBadge name={selectedDB} size="sm" />
          </div>
          <button onClick={clearChat} className="btn-ghost text-xs py-1 px-3">Clear</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {chatHistory.length === 0 && (
            <div className="h-full flex items-center justify-center text-gray-600 text-sm">
              Upload a PDF and start asking questions about your Big Data knowledge base.
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
                  <div className="w-7 h-7 rounded-full bg-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={14} className="text-accent" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary/25 text-white rounded-br-sm'
                    : 'bg-white/5 text-gray-200 rounded-bl-sm'
                }`}>
                  <p className="leading-relaxed">{msg.content}</p>
                  {msg.latency && (
                    <p className="text-xs text-gray-500 mt-1 font-mono">{msg.latency?.toFixed(1)} ms</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={14} className="text-primary" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isPending && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-accent/30 flex items-center justify-center">
                <Bot size={14} className="text-accent" />
              </div>
              <div className="bg-white/5 rounded-xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-5 py-3 border-t border-border flex-shrink-0">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`Query your knowledge base via ${selectedDB}...`}
              className="flex-1 bg-white/5 border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600
                         focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isPending}
              className="btn-primary px-4 py-2.5"
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
