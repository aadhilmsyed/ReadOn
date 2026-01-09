/**
 * Centralized environment variable configuration
 * Provides type-safe access to environment variables with helpful error messages
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Please set it in your .env file or environment.`
    );
  }
  
  return value;
}

export const env = {
  // OpenAI Configuration
  OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY'),
  
  // Google Gemini Configuration
  GEMINI_API_KEY: getEnvVar('GEMINI_API_KEY'),
  
  // Merriam-Webster Dictionary API
  MERRIAM_WEBSTER_API_KEY: getEnvVar('MERRIAM_WEBSTER_API_KEY'),
  
  // Application Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
} as const;

