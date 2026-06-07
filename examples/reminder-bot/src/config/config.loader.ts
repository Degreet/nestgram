import type { AppConfig } from './app-config';

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    botToken: required('BOT_TOKEN'),
    adminIds: (process.env.ADMIN_IDS ?? '')
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isFinite(id)),
    useWebhook: process.env.USE_WEBHOOK === 'true',
    webhookUrl: process.env.WEBHOOK_URL ?? '',
    webhookSecret: process.env.WEBHOOK_SECRET ?? '',
    port: Number(process.env.PORT ?? 3000),
    databaseUrl: required('DATABASE_URL'),
    redisHost: process.env.REDIS_HOST ?? 'localhost',
    redisPort: Number(process.env.REDIS_PORT ?? 6379),
  };
}
