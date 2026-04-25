import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import LatencyPage from './pages/LatencyPage'
import AccuracyPage from './pages/AccuracyPage'
import TradeoffPage from './pages/TradeoffPage'
import HybridPage from './pages/HybridPage'
import DXScorePage from './pages/DXScorePage'
import RAGChatPage from './pages/RAGChatPage'

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
