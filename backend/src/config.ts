import dotenv from 'dotenv';

dotenv.config();

function getEnv(name: string, fallback = ''): string {
  return (process.env[name] || fallback).trim();
}

function getNum(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

export const config = {
  port: getNum('PORT', 4000),
  corsOrigin: getEnv('CORS_ORIGIN', 'http://localhost:3000'),
  adminPassword: getEnv('ADMIN_PASSWORD'),
  superadminPassword: getEnv('SUPERADMIN_PASSWORD'),
  authSecret: getEnv('AUTH_SECRET', 'chengxin-guardian-dev-secret'),
  dataFile: getEnv('DATA_FILE', './data/app.json'),
  llm: {
    provider: getEnv('LLM_PROVIDER', 'domestic'),
    apiKey: getEnv('LLM_API_KEY'),
    baseUrl: getEnv('LLM_BASE_URL'),
    chatModel: getEnv('LLM_CHAT_MODEL'),
    diaryModel: getEnv('LLM_DIARY_MODEL'),
    timeoutMs: getNum('LLM_TIMEOUT_MS', 45000),
  }
};
