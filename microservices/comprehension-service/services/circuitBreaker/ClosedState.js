const { CircuitBreakerState } = require('./CircuitBreakerState');

class ClosedState extends CircuitBreakerState {
  constructor() {
    super('closed');
  }

  async handleRequest(circuitBreaker, operation) {
    try {
      const result = await operation();
      circuitBreaker.recordSuccess();
      return result;
    } catch (err) {
      circuitBreaker.recordFailure();
      throw err;
    }
  }
}

module.exports = { ClosedState };
