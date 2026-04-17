const service = require('../services/comprehensionService');

function createRequestId() {
  return `req_${Date.now().toString(36)}`;
}

function errorResponse(code, message, retryable, details) {
  return {
    error: {
      code,
      message,
      requestId: createRequestId(),
      retryable,
      details: details || [],
    },
  };
}

function validateGenerateRequest(body) {
  const details = [];

  if (!body || typeof body.sourceText !== 'string' || body.sourceText.trim().length === 0) {
    details.push({ field: 'sourceText', issue: 'required' });
  } else if (body.sourceText.length > 3500) {
    details.push({ field: 'sourceText', issue: 'maxLength' });
  }

  if (body.questionCount !== undefined) {
    const validQuestionCount = Number.isInteger(body.questionCount) && body.questionCount >= 1 && body.questionCount <= 10;
    if (!validQuestionCount) {
      details.push({ field: 'questionCount', issue: 'must_be_integer_between_1_and_10' });
    }
  }

  if (body.difficulty !== undefined && !['easy', 'medium', 'hard'].includes(body.difficulty)) {
    details.push({ field: 'difficulty', issue: 'must_be_easy_medium_or_hard' });
  }

  return details;
}

function validateAnswersRequest(body) {
  const details = [];

  if (!body || !Array.isArray(body.answers) || body.answers.length === 0) {
    return [{ field: 'answers', issue: 'required' }];
  }

  body.answers.forEach((answer, index) => {
    if (!answer || typeof answer.questionId !== 'string' || answer.questionId.trim().length === 0) {
      details.push({ field: `answers.${index}.questionId`, issue: 'required' });
    }

    if (!answer || !['A', 'B', 'C', 'D'].includes(answer.selectedChoiceId)) {
      details.push({ field: `answers.${index}.selectedChoiceId`, issue: 'must_be_A_B_C_or_D' });
    }
  });

  return details;
}

async function generateQuestions(body, context) {
  const details = validateGenerateRequest(body);

  if (details.length > 0) {
    return {
      statusCode: 400,
      body: errorResponse('validation_error', 'Invalid comprehension request.', false, details),
    };
  }

  const result = await service.generateQuestions({
    sourceText: body.sourceText,
    questionCount: body.questionCount || 5,
    difficulty: body.difficulty || 'medium',
    context,
  });

  return { statusCode: 200, body: result };
}

async function getResult(resultId) {
  const result = await service.getResult(resultId);

  if (!result) {
    return {
      statusCode: 404,
      body: errorResponse('not_found', 'Comprehension result was not found.', false),
    };
  }

  return { statusCode: 200, body: result };
}

async function submitAnswers(resultId, body, context) {
  const details = validateAnswersRequest(body);

  if (details.length > 0) {
    return {
      statusCode: 400,
      body: errorResponse('validation_error', 'Invalid answer submission.', false, details),
    };
  }

  const submission = await service.scoreAnswers(resultId, body.answers, context);

  if (!submission) {
    return {
      statusCode: 404,
      body: errorResponse('not_found', 'Comprehension result was not found.', false),
    };
  }

  return { statusCode: 200, body: submission };
}

async function getHistory(context) {
  if (!context.userId) {
    return {
      statusCode: 400,
      body: errorResponse('validation_error', 'User context is required to retrieve comprehension history.', false, [
        { field: 'userId', issue: 'required' },
      ]),
    };
  }

  const attempts = await service.getHistory(context.userId);

  return {
    statusCode: 200,
    body: {
      userId: context.userId,
      attempts,
    },
  };
}

module.exports = {
  generateQuestions,
  getHistory,
  getResult,
  submitAnswers,
};
