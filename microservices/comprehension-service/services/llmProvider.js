const { VertexAI } = require('@google-cloud/vertexai');

function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const err = new Error('LLM provider request timed out.');
      err.code = 'LLM_TIMEOUT';
      reject(err);
    }, ms);
  });
}

const QUESTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    questions: {
      type: 'array',
      minItems: 1,
      maxItems: 10,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          prompt: { type: 'string' },
          choices: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                text: { type: 'string' },
              },
              required: ['id', 'text'],
            },
          },
          correctChoiceId: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
          explanation: { type: 'string' },
        },
        required: ['prompt', 'choices', 'correctChoiceId', 'explanation'],
      },
    },
  },
  required: ['questions'],
};

function buildQuestionPrompt({ sourceText, questionCount, difficulty }) {
  return [
    'Create multiple-choice reading comprehension questions for students.',
    `Difficulty: ${difficulty}.`,
    `Number of questions: ${questionCount}.`,
    'Focus on understanding the story, not trivia. Include questions about main idea, key details, inference, sequence, vocabulary in context, character motivation, theme, or cause and effect when relevant.',
    'Use exactly four answer choices per question with ids A, B, C, and D. Make one clearly correct answer. Keep language age-appropriate for the requested difficulty.',
    '',
    'Story text:',
    sourceText,
  ].join('\n');
}

function buildOpenAiPrompt(args) {
  return buildQuestionPrompt(args);
}

function parseOpenAiResponse(body) {
  if (body && Array.isArray(body.output)) {
    for (const item of body.output) {
      if (!Array.isArray(item.content)) {
        continue;
      }

      for (const content of item.content) {
        if (content.type === 'output_text' && typeof content.text === 'string') {
          return JSON.parse(content.text);
        }
      }
    }
  }

  if (typeof body.output_text === 'string') {
    return JSON.parse(body.output_text);
  }

  const err = new Error('OpenAI response did not include JSON output text.');
  err.code = 'INVALID_LLM_RESPONSE';
  throw err;
}

function normalizeQuestions(rawQuestions, resultId) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    const err = new Error('LLM provider returned no questions.');
    err.code = 'INVALID_LLM_RESPONSE';
    throw err;
  }

  return rawQuestions.map((question, index) => {
    const choices = question.choices || question.options || [];
    const normalized = {
      id: question.id || `${resultId}_q${index + 1}`,
      type: 'multiple_choice',
      prompt: question.prompt || question.question || question.questionText,
      choices,
      correctChoiceId: question.correctChoiceId || question.correctAnswer,
      explanation: question.explanation || '',
    };

    const choiceIds = new Set(choices.map((choice) => choice.id));
    if (
      !normalized.prompt
      || choices.length !== 4
      || !['A', 'B', 'C', 'D'].every((id) => choiceIds.has(id))
      || !['A', 'B', 'C', 'D'].includes(normalized.correctChoiceId)
    ) {
      const err = new Error('LLM provider returned malformed questions.');
      err.code = 'INVALID_LLM_RESPONSE';
      throw err;
    }

    return normalized;
  });
}

async function callOpenAiProvider({ sourceText, questionCount, difficulty, resultId, config }) {
  if (!config.openAiApiKey) {
    const err = new Error('OPENAI_API_KEY is not configured.');
    err.code = 'LLM_PROVIDER_NOT_CONFIGURED';
    throw err;
  }

  const requestBody = {
    model: config.openAiModel,
    input: [
      {
        role: 'system',
        content: 'You are an expert reading teacher who writes helpful, fair comprehension questions for students.',
      },
      {
        role: 'user',
        content: buildOpenAiPrompt({ sourceText, questionCount, difficulty }),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'reading_comprehension_questions',
        strict: true,
        schema: QUESTION_SCHEMA,
      },
    },
  };

  const providerRequest = fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.openAiApiKey}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
  }).then(async (response) => {
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(body.error?.message || `OpenAI returned ${response.status}.`);
      err.code = 'LLM_PROVIDER_ERROR';
      throw err;
    }

    return body;
  });

  const body = await Promise.race([
    providerRequest,
    timeoutPromise(config.llmTimeoutMs),
  ]);

  const parsed = parseOpenAiResponse(body);
  return normalizeQuestions(parsed.questions || parsed, resultId);
}

async function callEndpointProvider({ sourceText, questionCount, difficulty, resultId, config }) {
  if (!config.llmEndpoint) {
    const err = new Error('READON_COMPREHENSION_LLM_ENDPOINT is not configured.');
    err.code = 'LLM_PROVIDER_NOT_CONFIGURED';
    throw err;
  }

  const providerRequest = fetch(config.llmEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sourceText, questionCount, difficulty }),
  }).then(async (response) => {
    if (!response.ok) {
      const err = new Error(`LLM provider returned ${response.status}.`);
      err.code = 'LLM_PROVIDER_ERROR';
      throw err;
    }

    return response.json();
  });

  const body = await Promise.race([
    providerRequest,
    timeoutPromise(config.llmTimeoutMs),
  ]);

  return normalizeQuestions(body.questions || body, resultId);
}

function parseVertexJsonResponse(body) {
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string' || !text.trim()) {
    const err = new Error('Vertex response did not include JSON output text.');
    err.code = 'INVALID_LLM_RESPONSE';
    throw err;
  }
  return JSON.parse(text);
}

async function callVertexProvider({ sourceText, questionCount, difficulty, resultId, config }) {
  const project = config.vertexProject;
  const location = config.vertexLocation;
  const model = config.vertexModel;

  if (!project || !location) {
    const err = new Error('VERTEX_AI_PROJECT and VERTEX_AI_LOCATION must be configured.');
    err.code = 'LLM_PROVIDER_NOT_CONFIGURED';
    throw err;
  }

  const vertexAI = new VertexAI({ project, location });
  const generativeModel = vertexAI.getGenerativeModel({
    model,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: QUESTION_SCHEMA,
    },
  });

  const providerRequest = generativeModel.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: [
              'You are an expert reading teacher who writes helpful, fair comprehension questions for students.',
              buildQuestionPrompt({ sourceText, questionCount, difficulty }),
            ].join('\n\n'),
          },
        ],
      },
    ],
  }).then((result) => result.response);

  const body = await Promise.race([
    providerRequest,
    timeoutPromise(config.llmTimeoutMs),
  ]);

  const parsed = parseVertexJsonResponse(body);
  return normalizeQuestions(parsed.questions || parsed, resultId);
}

async function callConfiguredProvider(args) {
  const provider = (args.config.llmProvider || '').toLowerCase();

  if (provider === 'openai' || (!provider && args.config.openAiApiKey)) {
    return callOpenAiProvider(args);
  }

  if (provider === 'vertex' || !provider) {
    return callVertexProvider(args);
  }

  return callEndpointProvider(args);
}

module.exports = {
  callConfiguredProvider,
};
