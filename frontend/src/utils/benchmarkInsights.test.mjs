import assert from 'node:assert/strict'
import {
  activeEngineCount,
  averageSearchLatencyByDb,
  dashboardRecommendation,
  latencySummaryByDb,
  recallPercentDomain,
  tradeoffConclusion,
} from './benchmarkInsights.js'

const metrics = [
  { Engine: 'Milvus', Operation: 'load', Duration_ms: 2 },
  { Engine: 'Milvus', Operation: 'search', Duration_ms: 6 },
  { Engine: 'Qdrant', Operation: 'search', Duration_ms: 4 },
  { Engine: 'Qdrant', Operation: 'search', Duration_ms: 6 },
  { Engine: 'Weaviate', Operation: 'search', Duration_ms: 15 },
]

assert.deepEqual(averageSearchLatencyByDb(metrics, ['Qdrant', 'Weaviate', 'Milvus']), {
  Qdrant: 5,
  Weaviate: 15,
  Milvus: 6,
})

assert.match(
  dashboardRecommendation(metrics, ['Qdrant', 'Weaviate', 'Milvus']),
  /^Qdrant currently has the lowest average search latency/,
)

const accuracySummary = [
  { Engine: 'Milvus', AvgLatency_ms: 6.34 },
  { Engine: 'Qdrant', AvgLatency_ms: 4.83 },
  { Engine: 'Weaviate', AvgLatency_ms: 14.47 },
]

assert.deepEqual(latencySummaryByDb({
  metrics: [{ Engine: 'Weaviate', Operation: 'search', Duration_ms: 1 }],
  accuracyResults: accuracySummary,
  dbs: ['Qdrant', 'Weaviate', 'Milvus'],
}), {
  Qdrant: 4.83,
  Weaviate: 14.47,
  Milvus: 6.34,
})

assert.equal(activeEngineCount({ databases: { Qdrant: true, Weaviate: false, Milvus: false } }, ['Qdrant', 'Weaviate', 'Milvus']), 1)

const tradeoff = [
  { Engine: 'Milvus', top_k: 50, Recall: 4, AvgLatency_ms: 6.52 },
  { Engine: 'Qdrant', top_k: 20, Recall: 17.5, AvgLatency_ms: 5.1 },
  { Engine: 'Qdrant', top_k: 50, Recall: 27, AvgLatency_ms: 5.82 },
  { Engine: 'Weaviate', top_k: 50, Recall: 24.5, AvgLatency_ms: 15.66 },
]

const conclusion = tradeoffConclusion(tradeoff)
assert.match(conclusion, /^Qdrant reaches the strongest observed recall/)
assert.match(conclusion, /27\.0%/)
assert.doesNotMatch(conclusion, /90%/)

assert.deepEqual(recallPercentDomain([0.03, 0.095, 0.27]), [0, 0.3])
assert.deepEqual(recallPercentDomain([0.65, 0.92]), [0, 1])
