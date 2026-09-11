/**
 * Typed, validated environment variable access.
 * Fails fast at startup if a required variable is missing.
 * Import this instead of process.env anywhere in the backend.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '4000'), 10),

  DATABASE_URL: requireEnv('DATABASE_URL'),

  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_ACCESS_EXPIRES_IN: optional('JWT_ACCESS_TOKEN_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_TOKEN_EXPIRES_IN', '30d'),

  GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET', ''),
  GOOGLE_REDIRECT_URI: optional(
    'GOOGLE_REDIRECT_URI',
    'http://localhost:4000/api/v1/auth/google/callback',
  ),

  CORS_ORIGINS: optional('CORS_ORIGINS', 'http://localhost:3000').split(','),

  FEATURE_AI: optional('FEATURE_FLAG_AI_HOUSEKEEPER', 'false') === 'true',

  AI_PROVIDER_API_KEY: optional('AI_PROVIDER_API_KEY', ''),
  AI_PROVIDER_BASE_URL: optional('AI_PROVIDER_BASE_URL', 'https://openrouter.ai/api/v1'),
  AI_MODEL: optional('AI_MODEL', 'anthropic/claude-3.5-haiku'),
  AI_SITE_URL: optional('AI_SITE_URL', 'http://localhost:3000'),
  AI_APP_NAME: optional('AI_APP_NAME', 'Arcanium'),

  get isDev() {
    return this.NODE_ENV === 'development';
  },
  get isProd() {
    return this.NODE_ENV === 'production';
  },
} as const;
