const { CircuitBreakerState } = require('./CircuitBreakerState');

class HalfOpenState extends CircuitBreakerState {
  constructor() {
    super('half_open');
  }

  async handleRequest(circuitBreaker, operation) {
    if (circuitBreaker.halfOpenProbeInFlight) {
      throw circuitBreaker.createOpenError('Circuit breaker is half-open and a probe request is already in flight.');
    }

    circuitBreaker.halfOpenProbeInFlight = true;

    try {
      const result = await operation();
      circuitBreaker.recordSuccess();
      return result;
    } catch (err) {
      circuitBreaker.recordFailure();
      throw err;
    } finally {
      circuitBreaker.halfOpenProbeInFlight = false;
    }
  }
}

module.exports = { HalfOpenState };
