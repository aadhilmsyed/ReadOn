const test = require('node:test');
const assert = require('node:assert/strict');

const { FallbackProvider } = require('../../services/fallbackProvider');
const { InMemoryQuestionCache } = require('../../services/inMemoryQuestionCache');

function buildCachedQuestion(idSuffix) {
  return {
    id: `cached_${idSuffix}`,
    type: 'multiple_choice',
    prompt: `Cached question ${idSuffix}?`,
    choices: [
      { id: 'A', text: 'A' },
      { id: 'B', text: 'B' },
      { id: 'C', text: 'C' },
      { id: 'D', text: 'D' },
    ],
    correctChoiceId: 'A',
    explanation: 'From cache.',
  };
}

test('returns in-memory cached questions when available', async () => {
  const cache = new InMemoryQuestionCache();
  cache.set('hash-1', {
    questions: [buildCachedQuestion(1), buildCachedQuestion(2)],
    providerName: 'openai',
  });

  const fallbackProvider = new FallbackProvider({
    cache,
    defaultQuestionsBuilder: () => [],
  });

  const fallback = await fallbackProvider.getFallback({
    sourceTextHash: 'hash-1',
    resultId: 'cmp_123',
    questionCount: 1,
    err: Object.assign(new Error('circuit open'), { code: 'CIRCUIT_OPEN' }),
    circuitBreaker: { state: 'open' },
  });

  assert.equal(fallback.cached, true);
  assert.equal(fallback.result.questions.length, 1);
  assert.equal(fallback.result.questions[0].id, 'cached_1');
  assert.equal(fallback.result.generation.source, 'cache');
  assert.equal(fallback.result.generation.fallbackReason, 'circuit_open');
});

test('returns default questions when in-memory cache misses', async () => {
  const fallbackProvider = new FallbackProvider({
    cache: new InMemoryQuestionCache(),
    defaultQuestionsBuilder: (resultId) => [buildCachedQuestion(resultId)],
  });

  const fallback = await fallbackProvider.getFallback({
    sourceTextHash: 'missing-hash',
    resultId: 'cmp_456',
    questionCount: 1,
    err: Object.assign(new Error('timeout'), { code: 'LLM_TIMEOUT' }),
    circuitBreaker: { state: 'closed' },
  });

  assert.equal(fallback.cached, false);
  assert.equal(fallback.result.generation.source, 'default_fallback');
  assert.equal(fallback.result.generation.fallbackReason, 'llm_timeout');
  assert.equal(fallback.result.questions.length, 1);
});
