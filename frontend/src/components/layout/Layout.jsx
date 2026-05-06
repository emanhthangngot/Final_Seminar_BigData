import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="relative flex h-screen overflow-hidden bg-surface text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ opacity: [0.38, 0.62, 0.38], scale: [1, 1.05, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-cyan/20 blur-3xl"
        />
        <motion.div
          animate={{ opacity: [0.28, 0.5, 0.28], x: [0, -30, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-12 top-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl"
        />
      </div>
      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
