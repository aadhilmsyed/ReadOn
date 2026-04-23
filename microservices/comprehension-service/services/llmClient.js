const { getComprehensionConfig } = require('../config');
const { callConfiguredProvider } = require('./llmProvider');

class LLMRequest {
  constructor({ sourceText, learnerLevel, questionType, questionCount, difficulty, resultId }) {
    this.sourceText = sourceText;
    this.learnerLevel = learnerLevel;
    this.questionType = questionType;
    this.questionCount = questionCount;
    this.difficulty = difficulty;
    this.resultId = resultId;
  }
}

class LLMResponse {
  constructor({ payload, providerName, questions }) {
    this.payload = payload;
    this.providerName = providerName;
    this.questions = questions;
  }
}

class LLMClient {
  constructor({ configFactory = getComprehensionConfig, providerCaller = callConfiguredProvider } = {}) {
    this.configFactory = configFactory;
    this.providerCaller = providerCaller;
  }

  getConfig() {
    return this.configFactory();
  }

  async generate(request) {
    const config = this.getConfig();
    const providerName = config.llmProvider || (config.openAiApiKey ? 'openai' : 'scaffold');
    const questions = await this.providerCaller({
      sourceText: request.sourceText,
      questionCount: request.questionCount,
      difficulty: request.difficulty,
      resultId: request.resultId,
      config,
    });

    return new LLMResponse({
      payload: questions,
      providerName,
      questions,
    });
  }
}

module.exports = {
  LLMClient,
  LLMRequest,
  LLMResponse,
};
