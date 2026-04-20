class CircuitBreaker {
  constructor({ failureThreshold, resetTimeoutMs, now }) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.now = now || (() => Date.now());
    this.state = 'closed';
    this.failureCount = 0;
    this.openedAtMs = null;
  }

  snapshot() {
    return {
      state: this.currentState(),
      failureCount: this.failureCount,
      openedAt: this.openedAtMs !== null ? new Date(this.openedAtMs).toISOString() : null,
      retryAfterSeconds: this.retryAfterSeconds(),
    };
  }

  currentState() {
    if (this.state === 'open' && this.openedAtMs !== null && this.now() - this.openedAtMs >= this.resetTimeoutMs) {
      this.state = 'half_open';
    }

    return this.state;
  }

  retryAfterSeconds() {
    if (this.state !== 'open' || this.openedAtMs === null) {
      return null;
    }

    const remainingMs = Math.max(this.resetTimeoutMs - (this.now() - this.openedAtMs), 0);
    return Math.ceil(remainingMs / 1000);
  }

  async execute(operation) {
    if (this.currentState() === 'open') {
      const err = new Error('Circuit breaker is open.');
      err.code = 'CIRCUIT_OPEN';
      throw err;
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  recordSuccess() {
    this.state = 'closed';
    this.failureCount = 0;
    this.openedAtMs = null;
  }

  recordFailure() {
    if (this.state === 'half_open') {
      this.open();
      return;
    }

    this.failureCount += 1;

    if (this.failureCount >= this.failureThreshold) {
      this.open();
    }
  }

  open() {
    this.state = 'open';
    this.openedAtMs = this.now();
  }

}

module.exports = { CircuitBreaker };
