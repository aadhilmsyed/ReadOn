const crypto = require('crypto');

const repository = require('../repositories/comprehensionRepository');
const { getComprehensionConfig } = require('../config');
const { CircuitBreaker } = require('./circuitBreaker');
const { callConfiguredProvider } = require('./llmProvider');

let breaker;

function getBreaker(config) {
  if (!breaker) {
    breaker = new CircuitBreaker({
      failureThreshold: config.circuitBreakerFailureThreshold,
      resetTimeoutMs: config.circuitBreakerResetMs,
    });
  }

  return breaker;
}

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

function fallbackReasonFor(err) {
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

async function generateQuestions({ sourceText, questionCount, difficulty, context }) {
  const config = getComprehensionConfig();
  const activeBreaker = getBreaker(config);
  const resolvedQuestionCount = questionCount || 5;
  const resolvedDifficulty = difficulty || 'medium';

  const sourceTextHash = hashQuestionRequest({
    sourceText,
    questionCount: resolvedQuestionCount,
    difficulty: resolvedDifficulty,
  });
  const resultId = createId('cmp');
  const providerName = config.llmProvider || 'scaffold';

  try {
    const questions = await activeBreaker.execute(() => callConfiguredProvider({
      sourceText,
      questionCount: resolvedQuestionCount,
      difficulty: resolvedDifficulty,
      resultId,
      config,
    }));

    const result = buildResult({
      resultId,
      sourceTextHash,
      questions: questions.slice(0, resolvedQuestionCount || questions.length),
      generation: {
        source: 'llm',
        fallbackUsed: false,
        fallbackReason: null,
        fallbackMessage: null,
      },
      circuitBreaker: activeBreaker.snapshot(),
    });

    return repository.saveResult(result, {
      userId: context.userId,
      storyId: context.storyId,
      title: context.title || buildTitle(sourceText),
      sourceText,
      provider: providerName,
    });
  } catch (err) {
    const circuitSnapshot = activeBreaker.snapshot();
    const fallbackReason = fallbackReasonFor(err);
    logProviderFailure(err, circuitSnapshot);

    const cached = await repository.findResultBySourceTextHash(sourceTextHash);

    if (cached) {
      return {
        ...cached,
        generation: {
          ...cached.generation,
          source: 'cache',
          fallbackUsed: true,
          fallbackReason: fallbackReason === 'circuit_open' ? 'circuit_open' : 'cache_hit_after_failure',
          fallbackMessage: fallbackReason === 'circuit_open'
            ? 'Question generation is temporarily paused, so a saved question set was returned.'
            : 'Generated questions are temporarily unavailable, so a saved question set was returned.',
          cached: true,
        },
        circuitBreaker: circuitSnapshot,
      };
    }

    const fallbackResult = buildResult({
      resultId,
      sourceTextHash,
      questions: buildDefaultQuestions(resultId).slice(0, resolvedQuestionCount || 1),
      generation: {
        source: 'default_fallback',
        fallbackUsed: true,
        fallbackReason,
        fallbackMessage: fallbackReason === 'circuit_open'
          ? 'Question generation is temporarily paused, so general comprehension questions were returned.'
          : 'Generated questions are temporarily unavailable, so general comprehension questions were returned.',
      },
      circuitBreaker: circuitSnapshot,
    });

    return repository.saveResult(fallbackResult, {
      userId: context.userId,
      storyId: context.storyId,
      title: context.title || buildTitle(sourceText),
      sourceText,
      provider: providerName,
    });
  }
}

async function getResult(resultId) {
  return repository.findResultById(resultId);
}

async function scoreAnswers(resultId, answers, context) {
  const result = await repository.findResultById(resultId);

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

  return repository.saveSubmission(submission, context.userId);
}

async function getHistory(userId) {
  return repository.findAttemptsByUserId(userId);
}

module.exports = {
  generateQuestions,
  getResult,
  getHistory,
  scoreAnswers,
};
