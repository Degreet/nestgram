export interface AppConfig {
  botToken: string;
  adminIds: number[];
  useWebhook: boolean;
  webhookUrl: string;
  webhookSecret: string;
  port: number;
  databaseUrl: string;
  redisHost: string;
  redisPort: number;
}
