import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, CheckCircle, Database, Layers3 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../services/api'

export default function UploadPanel({ selectedDB, onSuccess, compareMode = false }) {
  const [file, setFile] = useState(null)

  const { mutate, isPending, isSuccess, isError, error, reset } = useMutation({
    mutationFn: ({ file, db, all }) => all ? api.ingestDocumentAll(file) : api.ingestDocument(file, db),
    onSuccess: (data) => {
      onSuccess?.(data)
      setTimeout(() => { setFile(null); reset() }, 3000)
    },
  })

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) { setFile(accepted[0]); reset() }
  }, [reset])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  })

  return (
    <div className="card p-4 space-y-4">
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Data Ingestion</p>
          <p className="mt-1 text-xs text-slate-500">{compareMode ? 'sync one PDF to all engines' : 'PDF to chunks to embeddings'}</p>
        </div>
        <Database size={18} className="text-cyan" />
      </div>

      <div
        {...getRootProps()}
        className={`relative z-10 cursor-pointer rounded-2xl border border-dashed p-5 text-center transition-all duration-200
          ${isDragActive ? 'border-cyan bg-cyan/10 shadow-glow' : 'border-border bg-white/[0.035] hover:border-border-bright hover:bg-white/[0.065]'}`}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={{ y: isDragActive ? -3 : [0, -4, 0] }}
          transition={{ duration: 2, repeat: isDragActive ? 0 : Infinity, ease: 'easeInOut' }}
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan/20 bg-cyan/10"
        >
          <Upload size={20} className="text-cyan" />
        </motion.div>
        <p className="text-xs text-slate-300">
          {isDragActive ? 'Drop PDF here' : 'Drag PDF or click to select'}
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-2">
        {['Parse', 'Embed', 'Index'].map((stage, idx) => (
          <div key={stage} className="rounded-xl border border-white/10 bg-white/[0.035] px-2 py-2">
            <Layers3 size={12} className="mb-1 text-slate-500" />
            <p className="font-mono text-[10px] text-slate-500">{idx + 1}. {stage}</p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2"
          >
            <FileText size={14} className="text-primary flex-shrink-0" />
            <span className="text-xs text-gray-300 truncate flex-1">{file.name}</span>
            <button onClick={() => { setFile(null); reset() }} className="text-gray-400 hover:text-gray-300">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isError && (
        <p className="text-xs text-qdrant">{error?.message ?? 'Ingestion failed'}</p>
      )}
      {isSuccess && (
        <div className="relative z-10 space-y-2">
          <p className="text-xs text-milvus flex items-center gap-1">
            <CheckCircle size={12} /> Ingested successfully
          </p>
        </div>
      )}

      <button
        className="btn-primary relative z-10 w-full text-sm py-2"
        disabled={!file || isPending || !selectedDB}
        onClick={() => mutate({ file, db: selectedDB, all: compareMode })}
      >
        {isPending ? 'Processing...' : compareMode ? 'Ingest into all 3 DBs' : `Ingest into ${selectedDB ?? '—'}`}
      </button>
    </div>
  )
}
