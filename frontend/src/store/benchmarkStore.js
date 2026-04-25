import { create } from 'zustand'

export const useBenchmarkStore = create((set) => ({
  selectedDB: 'Qdrant',
  setSelectedDB: (db) => set({ selectedDB: db }),

  accuracyResults: [],
  setAccuracyResults: (results) => set({ accuracyResults: results }),

  tradeoffResults: [],
  setTradeoffResults: (results) => set({ tradeoffResults: results }),

  chatHistory: [],
  addChatMessage: (msg) => set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
  clearChat: () => set({ chatHistory: [] }),
}))
