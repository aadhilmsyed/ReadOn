class FallbackProvider {
  constructor({ cache, defaultQuestionsBuilder }) {
    this.cache = cache;
    this.defaultQuestionsBuilder = defaultQuestionsBuilder;
  }

  fallbackReasonFor(err) {
    if (!err) {
      return 'default_questions';
    }

    if (err.code === 'CIRCUIT_OPEN') {
      return 'circuit_open';
    }

    if (err.code === 'LLM_TIMEOUT') {
      return 'llm_timeout';
    }

    if (err.code === 'INVALID_LLM_RESPONSE') {
      return 'invalid_llm_response';
    }

    return 'llm_error';
  }

  async getFallback({ sourceTextHash, resultId, questionCount, err, circuitBreaker }) {
    const fallbackReason = this.fallbackReasonFor(err);
    const cached = this.cache.get(sourceTextHash);

    if (cached) {
      return {
        result: {
          questions: cached.questions.slice(0, questionCount || cached.questions.length),
          generation: {
            source: 'cache',
            fallbackUsed: true,
            fallbackReason: fallbackReason === 'circuit_open' ? 'circuit_open' : 'cache_hit_after_failure',
            fallbackMessage: fallbackReason === 'circuit_open'
              ? 'Question generation is temporarily paused, so a saved question set was returned.'
              : 'Generated questions are temporarily unavailable, so a saved question set was returned.',
            cached: true,
            persisted: false,
            generatedAt: new Date().toISOString(),
          },
          circuitBreaker,
        },
        cached: true,
        fallbackReason,
      };
    }

    return {
      result: {
        questions: this.defaultQuestionsBuilder(resultId).slice(0, questionCount || 1),
        generation: {
          source: 'default_fallback',
          fallbackUsed: true,
          fallbackReason,
          fallbackMessage: fallbackReason === 'circuit_open'
            ? 'Question generation is temporarily paused, so general comprehension questions were returned.'
            : 'Generated questions are temporarily unavailable, so general comprehension questions were returned.',
        },
        circuitBreaker,
      },
      cached: false,
      fallbackReason,
    };
  }

  setCachedQuestions(sourceTextHash, payload) {
    this.cache.set(sourceTextHash, payload);
  }
}

module.exports = { FallbackProvider };
