import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, CheckCircle } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../services/api'

export default function UploadPanel({ selectedDB, onSuccess }) {
  const [file, setFile] = useState(null)

  const { mutate, isPending, isSuccess, isError, error, reset } = useMutation({
    mutationFn: ({ file, db }) => api.ingestDocument(file, db),
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
    <div className="card p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Data Ingestion</p>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors duration-150
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-border-bright hover:bg-white/3'}`}
      >
        <input {...getInputProps()} />
        <Upload size={20} className="mx-auto text-gray-500 mb-2" />
        <p className="text-xs text-gray-400">
          {isDragActive ? 'Drop PDF here' : 'Drag PDF or click to select'}
        </p>
      </div>

      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2"
          >
            <FileText size={14} className="text-primary flex-shrink-0" />
            <span className="text-xs text-gray-300 truncate flex-1">{file.name}</span>
            <button onClick={() => { setFile(null); reset() }} className="text-gray-500 hover:text-gray-300">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isError && (
        <p className="text-xs text-qdrant">{error?.message ?? 'Ingestion failed'}</p>
      )}
      {isSuccess && (
        <p className="text-xs text-milvus flex items-center gap-1">
          <CheckCircle size={12} /> Ingested successfully
        </p>
      )}

      <button
        className="btn-primary w-full text-sm py-2"
        disabled={!file || isPending || !selectedDB}
        onClick={() => mutate({ file, db: selectedDB })}
      >
        {isPending ? 'Processing...' : `Ingest into ${selectedDB ?? '—'}`}
      </button>
    </div>
  )
}
