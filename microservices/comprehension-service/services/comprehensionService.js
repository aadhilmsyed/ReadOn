const crypto = require('crypto');

const repository = require('../repositories/comprehensionRepository');
const { getComprehensionConfig } = require('../config');
const { CircuitBreaker } = require('./circuitBreaker');
const { LLMClient, LLMRequest } = require('./llmClient');
const { FallbackProvider } = require('./fallbackProvider');
const { InMemoryQuestionCache } = require('./inMemoryQuestionCache');

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function hashQuestionRequest({ sourceText, questionCount, difficulty }) {
  const normalized = sourceText.trim().replace(/\s+/g, ' ');
  const payload = JSON.stringify({
    version: 2,
    sourceText: normalized,
    questionCount,
    difficulty,
  });

  return `sha256:${crypto.createHash('sha256').update(payload).digest('hex')}`;
}

function buildTitle(sourceText) {
  return sourceText.trim().replace(/\s+/g, ' ').split(' ').slice(0, 8).join(' ') || 'Untitled reading';
}

function buildDefaultQuestions(resultId) {
  return [
    {
      id: `${resultId}_q1`,
      type: 'multiple_choice',
      prompt: 'What is the main idea of the text?',
      choices: [
        { id: 'A', text: 'The most important point or message.' },
        { id: 'B', text: 'A minor detail.' },
        { id: 'C', text: 'An unrelated fact.' },
        { id: 'D', text: 'A repeated word.' },
      ],
      correctChoiceId: 'A',
      explanation: 'The main idea is the central point the text communicates.',
    },
  ];
}

function logProviderFailure(err, snapshot) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    level: 'WARN',
    message: 'comprehension_provider_fallback',
    error: {
      code: err.code,
      message: err.message,
    },
    circuitBreaker: snapshot,
    now: new Date().toISOString(),
  }));
}

function buildResult({ resultId, sourceTextHash, questions, generation, circuitBreaker }) {
  return {
    resultId,
    status: 'completed',
    sourceTextHash,
    questions,
    generation: {
      cached: false,
      persisted: false,
      generatedAt: new Date().toISOString(),
      ...generation,
    },
    circuitBreaker,
  };
}

class ComprehensionService {
  constructor({
    repositoryImpl = repository,
    configFactory = getComprehensionConfig,
    llmClient = new LLMClient({ configFactory }),
    fallbackProvider = new FallbackProvider({
      cache: new InMemoryQuestionCache(),
      defaultQuestionsBuilder: buildDefaultQuestions,
    }),
  } = {}) {
    this.repository = repositoryImpl;
    this.configFactory = configFactory;
    this.llmClient = llmClient;
    this.fallbackProvider = fallbackProvider;
    this.breaker = null;
  }

  getBreaker(config) {
    if (!this.breaker) {
      this.breaker = new CircuitBreaker({
        failureThreshold: config.circuitBreakerFailureThreshold,
        resetTimeoutMs: config.circuitBreakerResetMs,
      });
    }

    return this.breaker;
  }

  async generateQuestions({ sourceText, questionCount, difficulty, context }) {
    const config = this.configFactory();
    const activeBreaker = this.getBreaker(config);
    const resolvedQuestionCount = questionCount || 5;
    const resolvedDifficulty = difficulty || 'medium';

    const sourceTextHash = hashQuestionRequest({
      sourceText,
      questionCount: resolvedQuestionCount,
      difficulty: resolvedDifficulty,
    });
    const resultId = createId('cmp');
    const request = new LLMRequest({
      sourceText,
      learnerLevel: resolvedDifficulty,
      questionType: 'multiple_choice',
      questionCount: resolvedQuestionCount,
      difficulty: resolvedDifficulty,
      resultId,
    });

    try {
      const llmResponse = await activeBreaker.execute(() => this.llmClient.generate(request));
      this.fallbackProvider.setCachedQuestions(sourceTextHash, {
        questions: llmResponse.questions,
        providerName: llmResponse.providerName,
      });

      const result = buildResult({
        resultId,
        sourceTextHash,
        questions: llmResponse.questions.slice(0, resolvedQuestionCount || llmResponse.questions.length),
        generation: {
          source: 'llm',
          fallbackUsed: false,
          fallbackReason: null,
          fallbackMessage: null,
        },
        circuitBreaker: activeBreaker.snapshot(),
      });

      return this.repository.saveResult(result, {
        userId: context.userId,
        storyId: context.storyId,
        title: context.title || buildTitle(sourceText),
        sourceText,
        provider: llmResponse.providerName,
      });
    } catch (err) {
      const circuitSnapshot = activeBreaker.snapshot();
      logProviderFailure(err, circuitSnapshot);

      const fallback = await this.fallbackProvider.getFallback({
        sourceTextHash,
        resultId,
        questionCount: resolvedQuestionCount,
        err,
        circuitBreaker: circuitSnapshot,
      });

      if (fallback.cached) {
        return fallback.result;
      }

      const fallbackResult = buildResult({
        resultId,
        sourceTextHash,
        questions: fallback.result.questions,
        generation: fallback.result.generation,
        circuitBreaker: fallback.result.circuitBreaker,
      });

      return this.repository.saveResult(fallbackResult, {
        userId: context.userId,
        storyId: context.storyId,
        title: context.title || buildTitle(sourceText),
        sourceText,
        provider: config.llmProvider || 'scaffold',
      });
    }
  }

  async getResult(resultId) {
    return this.repository.findResultById(resultId);
  }

  async scoreAnswers(resultId, answers, context) {
    const result = await this.repository.findResultById(resultId);

    if (!result) {
      return null;
    }

    const questionById = new Map(result.questions.map((question) => [question.id, question]));
    const scoredAnswers = answers.map((answer) => {
      const question = questionById.get(answer.questionId);
      const correctChoiceId = question ? question.correctChoiceId : 'A';

      return {
        questionId: answer.questionId,
        selectedChoiceId: answer.selectedChoiceId,
        correctChoiceId,
        isCorrect: Boolean(correctChoiceId && answer.selectedChoiceId === correctChoiceId),
        explanation: question ? question.explanation : 'Question was not found in this result.',
      };
    });

    const correct = scoredAnswers.filter((answer) => answer.isCorrect).length;
    const total = scoredAnswers.length;
    const submission = {
      resultId,
      submissionId: createId('sub'),
      status: 'scored',
      score: {
        correct,
        total,
        percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
      },
      answers: scoredAnswers,
      persisted: false,
      scoredAt: new Date().toISOString(),
    };

    return this.repository.saveSubmission(submission, context.userId);
  }

  async getHistory(userId) {
    return this.repository.findAttemptsByUserId(userId);
  }
}

const comprehensionService = new ComprehensionService();

module.exports = {
  ComprehensionService,
  buildDefaultQuestions,
  generateQuestions: (...args) => comprehensionService.generateQuestions(...args),
  getResult: (...args) => comprehensionService.getResult(...args),
  getHistory: (...args) => comprehensionService.getHistory(...args),
  scoreAnswers: (...args) => comprehensionService.scoreAnswers(...args),
};
