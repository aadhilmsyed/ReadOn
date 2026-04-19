const test = require('node:test');
const assert = require('node:assert/strict');

const { CircuitBreaker } = require('./circuitBreaker');

function failingOperation(code) {
  return async () => {
    const err = new Error('provider failed');
    err.code = code || 'LLM_PROVIDER_ERROR';
    throw err;
  };
}

test('breaker opens after threshold failures', async () => {
  const breaker = new CircuitBreaker({
    failureThreshold: 2,
    resetTimeoutMs: 1000,
    now: () => 0,
  });

  await assert.rejects(() => breaker.execute(failingOperation()));
  assert.equal(breaker.snapshot().state, 'closed');
  assert.equal(breaker.snapshot().failureCount, 1);

  await assert.rejects(() => breaker.execute(failingOperation()));
  assert.equal(breaker.snapshot().state, 'open');
  assert.equal(breaker.snapshot().failureCount, 2);
});

test('open breaker rejects without calling provider', async () => {
  const breaker = new CircuitBreaker({
    failureThreshold: 1,
    resetTimeoutMs: 1000,
    now: () => 0,
  });

  await assert.rejects(() => breaker.execute(failingOperation()));

  let providerCalled = false;
  await assert.rejects(
    async () => {
      await breaker.execute(async () => {
        providerCalled = true;
        return 'provider';
      });
    },
    {
      code: 'CIRCUIT_OPEN',
    },
  );

  assert.equal(providerCalled, false);
});

test('half-open success closes breaker', async () => {
  let now = 0;
  const breaker = new CircuitBreaker({
    failureThreshold: 1,
    resetTimeoutMs: 1000,
    now: () => now,
  });

  await assert.rejects(() => breaker.execute(failingOperation()));
  assert.equal(breaker.snapshot().state, 'open');

  now = 1000;
  const result = await breaker.execute(async () => 'ok');

  assert.equal(result, 'ok');
  assert.equal(breaker.snapshot().state, 'closed');
  assert.equal(breaker.snapshot().failureCount, 0);
});

test('half-open failure reopens breaker', async () => {
  let now = 0;
  const breaker = new CircuitBreaker({
    failureThreshold: 1,
    resetTimeoutMs: 1000,
    now: () => now,
  });

  await assert.rejects(() => breaker.execute(failingOperation()));
  assert.equal(breaker.snapshot().state, 'open');

  now = 1000;
  await assert.rejects(() => breaker.execute(failingOperation('LLM_TIMEOUT')));

  const snapshot = breaker.snapshot();
  assert.equal(snapshot.state, 'open');
  assert.equal(snapshot.failureCount, 1);
  assert.equal(snapshot.retryAfterSeconds, 1);
});
