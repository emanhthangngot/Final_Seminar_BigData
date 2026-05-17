const SEARCH_OP = 'search'

export const averageSearchLatencyByDb = (metrics = [], dbs = []) =>
  Object.fromEntries(dbs.map((db) => {
    const rows = metrics.filter((row) => row.Engine === db && row.Operation === SEARCH_OP)
    if (!rows.length) return [db, null]

    const average = rows.reduce((sum, row) => sum + Number(row.Duration_ms || 0), 0) / rows.length
    return [db, average]
  }))

export const latencySummaryByDb = ({ accuracyResults = [], metrics = [], dbs = [] } = {}) => {
  const summaryRows = accuracyResults.filter((row) => Number.isFinite(Number(row.AvgLatency_ms)))
  if (summaryRows.length) {
    return Object.fromEntries(dbs.map((db) => {
      const row = summaryRows.find((candidate) => candidate.Engine === db)
      return [db, row ? Number(row.AvgLatency_ms) : null]
    }))
  }

  return averageSearchLatencyByDb(metrics, dbs)
}

export const formatLatency = (value) => (
  Number.isFinite(value) ? value.toFixed(1) : '—'
)

export const dashboardRecommendation = (source = [], dbs = []) => {
  const averages = Array.isArray(source)
    ? averageSearchLatencyByDb(source, dbs)
    : latencySummaryByDb({ ...source, dbs })
  const ranked = Object.entries(averages)
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => a[1] - b[1])

  if (!ranked.length) {
    return 'Waiting for searchable latency samples before choosing a routing recommendation.'
  }

  const [leader, latency] = ranked[0]
  const second = ranked[1]
  const comparison = second
    ? `, ahead of ${second[0]} at ${formatLatency(second[1])} ms`
    : ''

  return `${leader} currently has the lowest average search latency at ${formatLatency(latency)} ms${comparison}; validate recall before production routing.`
}

export const activeEngineCount = (health, dbs = []) => (
  dbs.filter((db) => health?.databases?.[db]).length
)

export const tradeoffConclusion = (rows = []) => {
  const validRows = rows
    .map((row) => ({
      engine: row.Engine,
      topK: Number(row.top_k),
      recall: Number(row.Recall),
      latency: Number(row.AvgLatency_ms),
    }))
    .filter((row) => row.engine && Number.isFinite(row.recall) && Number.isFinite(row.latency))

  if (!validRows.length) {
    return 'Run or load a tradeoff sweep to identify the current recall and latency frontier.'
  }

  const bestRecall = [...validRows].sort((a, b) => b.recall - a.recall || a.latency - b.latency)[0]
  const lowLatencyThreshold = Math.max(bestRecall.latency, 10)
  const lowLatencyRows = validRows.filter((row) => row.latency <= lowLatencyThreshold)
  const lowLatencyBest = [...lowLatencyRows].sort((a, b) => b.recall - a.recall || a.latency - b.latency)[0]

  if (lowLatencyBest.engine === bestRecall.engine && lowLatencyBest.topK === bestRecall.topK) {
    return `${bestRecall.engine} reaches the strongest observed recall (${bestRecall.recall.toFixed(1)}%) at top_k=${bestRecall.topK} with ${bestRecall.latency.toFixed(2)} ms average latency. Use that point for recall-sensitive demos, then tune top_k down only when latency budget tightens.`
  }

  return `${bestRecall.engine} reaches the strongest observed recall (${bestRecall.recall.toFixed(1)}%) at top_k=${bestRecall.topK}, while ${lowLatencyBest.engine} gives the best sub-${lowLatencyThreshold.toFixed(0)} ms recall (${lowLatencyBest.recall.toFixed(1)}%). Route by recall target first, then by SDK maturity.`
}

export const recallPercentDomain = (values = []) => {
  const max = Math.max(0, ...values.filter((value) => Number.isFinite(value)))
  if (max <= 0) return [0, 1]
  if (max >= 0.6) return [0, 1]

  const paddedMax = Math.min(1, Math.ceil(((max + 0.03) * 10) - Number.EPSILON) / 10)
  return [0, Math.max(0.1, paddedMax)]
}
