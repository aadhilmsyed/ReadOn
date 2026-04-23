const { ClosedState } = require('./circuitBreaker/ClosedState');
const { OpenState } = require('./circuitBreaker/OpenState');
const { HalfOpenState } = require('./circuitBreaker/HalfOpenState');

class CircuitBreaker {
  constructor({ failureThreshold, resetTimeoutMs, now }) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.now = now || (() => Date.now());
    this.failureCount = 0;
    this.openedAtMs = null;
    this.halfOpenProbeInFlight = false;
    this.closedState = new ClosedState();
    this.openState = new OpenState();
    this.halfOpenState = new HalfOpenState();
    this.state = this.closedState;
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
    if (this.state.name === 'open' && this.shouldAttemptReset()) {
      this.transitionToHalfOpen();
    }

    return this.state.name;
  }

  retryAfterSeconds() {
    if (this.state.name !== 'open' || this.openedAtMs === null) {
      return null;
    }

    const remainingMs = Math.max(this.resetTimeoutMs - (this.now() - this.openedAtMs), 0);
    return Math.ceil(remainingMs / 1000);
  }

  shouldAttemptReset() {
    return this.openedAtMs !== null && this.now() - this.openedAtMs >= this.resetTimeoutMs;
  }

  createOpenError(message) {
    const err = new Error(message || 'Circuit breaker is open.');
    err.code = 'CIRCUIT_OPEN';
    return err;
  }

  setState(nextState) {
    this.state = nextState;
  }

  transitionToOpen() {
    this.openedAtMs = this.now();
    this.setState(this.openState);
  }

  transitionToHalfOpen() {
    this.setState(this.halfOpenState);
  }

  transitionToClosed() {
    this.openedAtMs = null;
    this.halfOpenProbeInFlight = false;
    this.setState(this.closedState);
  }

  async execute(operation) {
    return this.state.handleRequest(this, operation);
  }

  recordSuccess() {
    this.failureCount = 0;
    this.transitionToClosed();
  }

  recordFailure() {
    if (this.state.name === 'half_open') {
      this.transitionToOpen();
      return;
    }

    this.failureCount += 1;

    if (this.failureCount >= this.failureThreshold) {
      this.transitionToOpen();
    }
  }
}

module.exports = {
  CircuitBreaker,
  ClosedState,
  OpenState,
  HalfOpenState,
};
