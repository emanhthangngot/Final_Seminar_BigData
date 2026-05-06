import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const LatencyPage = lazy(() => import('./pages/LatencyPage'))
const AccuracyPage = lazy(() => import('./pages/AccuracyPage'))
const TradeoffPage = lazy(() => import('./pages/TradeoffPage'))
const HybridPage = lazy(() => import('./pages/HybridPage'))
const DXScorePage = lazy(() => import('./pages/DXScorePage'))
const RAGChatPage = lazy(() => import('./pages/RAGChatPage'))

function PageFallback() {
  return (
    <div className="card flex h-[360px] items-center justify-center">
      <div className="relative z-10 text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-2xl border border-cyan/20 bg-cyan/10 shadow-glow" />
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">Loading module</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="latency" element={<LatencyPage />} />
            <Route path="accuracy" element={<AccuracyPage />} />
            <Route path="tradeoff" element={<TradeoffPage />} />
            <Route path="hybrid" element={<HybridPage />} />
            <Route path="dx-score" element={<DXScorePage />} />
            <Route path="rag-chat" element={<RAGChatPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
