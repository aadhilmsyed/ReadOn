function readNumberEnv(name, defaultValue) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : defaultValue;
}

function readStringEnv(name) {
  const value = process.env[name] || '';
  return value === 'REPLACE_ME' ? '' : value;
}

function getComprehensionConfig() {
  const openAiApiKey = readStringEnv('OPENAI_API_KEY');
  const configuredProvider = readStringEnv('READON_COMPREHENSION_LLM_PROVIDER');

  return {
    llmProvider: configuredProvider || 'vertex',
    llmEndpoint: readStringEnv('READON_COMPREHENSION_LLM_ENDPOINT'),
    openAiApiKey,
    openAiModel: readStringEnv('READON_COMPREHENSION_OPENAI_MODEL') || 'gpt-4o-mini',
    vertexProject: readStringEnv('VERTEX_AI_PROJECT') || readStringEnv('GCP_PROJECT_ID') || 'readon-ai',
    vertexLocation: readStringEnv('VERTEX_AI_LOCATION') || readStringEnv('REGION') || 'us-central1',
    vertexModel: readStringEnv('READON_COMPREHENSION_VERTEX_MODEL') || 'gemini-2.5-flash',
    llmTimeoutMs: readNumberEnv('READON_COMPREHENSION_LLM_TIMEOUT_MS', 60000),
    circuitBreakerFailureThreshold: readNumberEnv('READON_COMPREHENSION_CIRCUIT_BREAKER_FAILURE_THRESHOLD', 3),
    circuitBreakerResetMs: readNumberEnv('READON_COMPREHENSION_CIRCUIT_BREAKER_RESET_MS', 60000),
  };
}

module.exports = { getComprehensionConfig };
