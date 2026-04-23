class InMemoryQuestionCache {
  constructor() {
    this.entries = new Map();
  }

  get(key) {
    return this.entries.get(key) || null;
  }

  set(key, value) {
    this.entries.set(key, value);
  }
}

module.exports = { InMemoryQuestionCache };
