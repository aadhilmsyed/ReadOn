const { CircuitBreakerState } = require('./CircuitBreakerState');

class OpenState extends CircuitBreakerState {
  constructor() {
    super('open');
  }

  async handleRequest(circuitBreaker, operation) {
    if (circuitBreaker.shouldAttemptReset()) {
      circuitBreaker.transitionToHalfOpen();
      return circuitBreaker.execute(operation);
    }

    throw circuitBreaker.createOpenError();
  }
}

module.exports = { OpenState };
