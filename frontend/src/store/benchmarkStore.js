import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const normalizeComparisonSessions = (sessions = []) => sessions.map((session) => {
  if (session.status !== 'loading') return session

  const results = Object.fromEntries(Object.entries(session.results ?? {}).map(([db, result]) => [
    db,
    result.status === 'loading'
      ? { ...result, status: 'error', error: 'Request was interrupted by a page refresh.' }
      : result,
  ]))

  return {
    ...session,
    status: 'error',
    results,
    summary: session.summary ?? { success_count: 0, error_count: Object.keys(results).length },
  }
})

const mergePersistedState = (persisted, current) => ({
  ...current,
  ...persisted,
  ragChat: {
    ...current.ragChat,
    ...(persisted?.ragChat ?? {}),
    comparisonSessions: normalizeComparisonSessions(persisted?.ragChat?.comparisonSessions ?? current.ragChat.comparisonSessions),
    ingestion: {
      ...current.ragChat.ingestion,
      ...(persisted?.ragChat?.ingestion ?? {}),
    },
    reset: {
      ...current.ragChat.reset,
      ...(persisted?.ragChat?.reset ?? {}),
    },
  },
  hybridSearch: {
    ...current.hybridSearch,
    ...(persisted?.hybridSearch ?? {}),
  },
})

export const useBenchmarkStore = create(persist((set) => ({
  selectedDB: 'Qdrant',
  setSelectedDB: (db) => set({ selectedDB: db }),

  accuracyResults: [],
  setAccuracyResults: (results) => set({ accuracyResults: results }),

  tradeoffResults: [],
  setTradeoffResults: (results) => set({ tradeoffResults: results }),

  chatHistory: [],
  addChatMessage: (msg) => set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
  clearChat: () => set({ chatHistory: [] }),

  ragChat: {
    input: '',
    compareMode: true,
    comparisonSessions: [],
    currentDocument: null,
    ingestion: {
      selectedFileName: null,
      status: 'idle',
      error: null,
      result: null,
      updatedAt: null,
    },
    reset: {
      status: 'idle',
      error: null,
      updatedAt: null,
    },
  },
  setRagInput: (input) => set((s) => ({ ragChat: { ...s.ragChat, input } })),
  setRagCompareMode: (compareMode) => set((s) => ({ ragChat: { ...s.ragChat, compareMode } })),
  addComparisonSession: (session) => set((s) => ({
    ragChat: {
      ...s.ragChat,
      comparisonSessions: [...s.ragChat.comparisonSessions, session],
    },
  })),
  updateComparisonSession: (id, updater) => set((s) => ({
    ragChat: {
      ...s.ragChat,
      comparisonSessions: s.ragChat.comparisonSessions.map((session) => (
        session.id === id ? updater(session) : session
      )),
    },
  })),
  clearRagWorkspace: () => set((s) => ({
    chatHistory: [],
    ragChat: {
      ...s.ragChat,
      input: '',
      comparisonSessions: [],
    },
  })),
  startDocumentReplacement: (selectedFileName) => set((s) => ({
    ragChat: {
      ...s.ragChat,
      ingestion: {
        selectedFileName,
        status: 'pending',
        error: null,
        result: null,
        updatedAt: new Date().toISOString(),
      },
      reset: {
        ...s.ragChat.reset,
        status: 'idle',
        error: null,
        updatedAt: new Date().toISOString(),
      },
    },
  })),
  completeDocumentReplacement: (data) => set((s) => ({
    chatHistory: [],
    hybridSearch: {
      ...s.hybridSearch,
      data: null,
    },
    ragChat: {
      ...s.ragChat,
      input: '',
      comparisonSessions: [],
      currentDocument: data?.filename ?? 'Uploaded PDF',
      ingestion: {
        selectedFileName: data?.filename ?? s.ragChat.ingestion.selectedFileName,
        status: 'success',
        error: null,
        result: data,
        updatedAt: new Date().toISOString(),
      },
    },
  })),
  failDocumentReplacement: (error) => set((s) => ({
    ragChat: {
      ...s.ragChat,
      ingestion: {
        ...s.ragChat.ingestion,
        status: 'error',
        error,
        updatedAt: new Date().toISOString(),
      },
    },
  })),
  markLoadingComparisonsInterrupted: () => set((s) => ({
    ragChat: {
      ...s.ragChat,
      comparisonSessions: normalizeComparisonSessions(s.ragChat.comparisonSessions),
    },
  })),
  setCurrentDocument: (currentDocument) => set((s) => ({
    ragChat: {
      ...s.ragChat,
      currentDocument,
    },
  })),
  setIngestionState: (ingestion) => set((s) => ({
    ragChat: {
      ...s.ragChat,
      ingestion: {
        ...s.ragChat.ingestion,
        ...ingestion,
        updatedAt: new Date().toISOString(),
      },
    },
  })),
  setResetState: (reset) => set((s) => ({
    ragChat: {
      ...s.ragChat,
      reset: {
        ...s.ragChat.reset,
        ...reset,
        updatedAt: new Date().toISOString(),
      },
    },
  })),

  hybridSearch: {
    query: 'vector database filtering benchmark',
    data: null,
  },
  setHybridQuery: (query) => set((s) => ({ hybridSearch: { ...s.hybridSearch, query } })),
  setHybridData: (data) => set((s) => ({ hybridSearch: { ...s.hybridSearch, data } })),
}), {
  name: 'vectordb-benchmark-ui-state',
  storage: createJSONStorage(() => localStorage),
  version: 1,
  merge: mergePersistedState,
  partialize: (state) => ({
    selectedDB: state.selectedDB,
    accuracyResults: state.accuracyResults,
    tradeoffResults: state.tradeoffResults,
    chatHistory: state.chatHistory,
    ragChat: {
      ...state.ragChat,
    },
    hybridSearch: state.hybridSearch,
  }),
}))
