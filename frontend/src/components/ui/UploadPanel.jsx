import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, CheckCircle, Database, Layers3, RefreshCw } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../services/api'
import { useBenchmarkStore } from '../../store/benchmarkStore'

export default function UploadPanel({ selectedDB, onSuccess, onResetSuccess, compareMode = false, forceAll = false }) {
  const [file, setFile] = useState(null)
  const ingestAll = forceAll || compareMode
  const {
    ragChat,
    setIngestionState,
    setResetState,
    startDocumentReplacement,
    completeDocumentReplacement,
    failDocumentReplacement,
  } = useBenchmarkStore()
  const { ingestion, reset: resetStatus } = ragChat

  const { mutate, isPending, isSuccess, isError, error, reset } = useMutation({
    mutationFn: ({ file, db, all }) => all ? api.ingestDocumentAll(file) : api.ingestDocument(file, db),
    onMutate: ({ file }) => {
      startDocumentReplacement(file.name)
    },
    onSuccess: (data) => {
      completeDocumentReplacement(data)
      onSuccess?.(data)
      setTimeout(() => { setFile(null); reset() }, 3000)
    },
    onError: (err) => {
      failDocumentReplacement(err?.message ?? 'Ingestion failed')
    },
  })

  const {
    mutate: resetAll,
    isPending: isResetting,
    isSuccess: isResetSuccess,
    isError: isResetError,
    error: resetError,
  } = useMutation({
    mutationFn: api.resetAllDocuments,
    onMutate: () => setResetState({ status: 'pending', error: null }),
    onSuccess: (data) => {
      setResetState({ status: 'success', error: null })
      setIngestionState({ selectedFileName: null, status: 'idle', error: null, result: null })
      onResetSuccess?.(data)
    },
    onError: (err) => setResetState({ status: 'error', error: err?.message ?? 'Reset failed' }),
  })

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) {
      setFile(accepted[0])
      setIngestionState({
        selectedFileName: accepted[0].name,
        status: 'selected',
        error: null,
        result: null,
      })
      reset()
    }
  }, [reset, setIngestionState])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  })

  return (
    <div className="card p-4 space-y-4">
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Data Ingestion</p>
          <p className="mt-1 text-xs text-slate-500">
            {ingestAll ? 'PDF -> chunks -> embeddings -> 3 DBs' : 'PDF -> chunks -> embeddings'}
          </p>
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

      {!file && ingestion.selectedFileName && (
        <div className="relative z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2">
          <FileText size={14} className="text-primary flex-shrink-0" />
          <span className="text-xs text-gray-300 truncate flex-1">{ingestion.selectedFileName}</span>
        </div>
      )}

      {(isError || ingestion.status === 'error') && (
        <p className="text-xs text-qdrant">{error?.message ?? ingestion.error ?? 'Ingestion failed'}</p>
      )}
      {(isSuccess || ingestion.status === 'success') && (
        <div className="relative z-10 space-y-2">
          <p className="flex items-center gap-1 text-xs text-milvus">
            <CheckCircle size={12} /> Ingested into {ingestAll ? 'all 3 DBs' : selectedDB}
          </p>
        </div>
      )}
      {(isResetError || resetStatus.status === 'error') && (
        <p className="text-xs text-qdrant">{resetError?.message ?? resetStatus.error ?? 'Reset failed'}</p>
      )}
      {(isResetSuccess || resetStatus.status === 'success') && (
        <p className="relative z-10 flex items-center gap-1 text-xs text-amber-200">
          <CheckCircle size={12} /> All 3 databases were reset
        </p>
      )}

      <div className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <button
          className="btn-primary w-full py-2 text-sm"
          disabled={!file || isPending || isResetting || (!selectedDB && !ingestAll)}
          onClick={() => mutate({ file, db: selectedDB, all: ingestAll })}
        >
          {isPending ? 'Chunking + indexing...' : ingestAll ? 'Ingest into all 3 DBs' : `Ingest into ${selectedDB ?? '-'}`}
        </button>
        <button
          className="btn-ghost h-10 w-10 p-0"
          disabled={isPending || isResetting}
          onClick={() => {
            if (window.confirm('Reset all data in Qdrant, Weaviate, and Milvus?')) {
              resetAll()
            }
          }}
          title="Reset all 3 databases"
          aria-label="Reset all 3 databases"
        >
          <RefreshCw size={16} className={isResetting ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  )
}
