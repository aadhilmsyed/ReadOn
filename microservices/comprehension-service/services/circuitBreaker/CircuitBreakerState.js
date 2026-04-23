class CircuitBreakerState {
  constructor(name) {
    this.name = name;
  }

  async handleRequest() {
    throw new Error('CircuitBreakerState.handleRequest must be implemented.');
  }
}

module.exports = { CircuitBreakerState };
