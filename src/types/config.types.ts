export type RunTypes = 'polling' | 'webhook';
export type ConfigTypes = IPollingConfig | IWebhookConfig;
export type WebhookPorts = 443 | 80 | 88 | 8443;

interface IGlobalRunnerConfig {
  allowed_updates?: string[];
}

interface IGlobalWebhookConfig {
  drop_pending_updates?: boolean;
}

export interface IConfig {
  type: RunTypes;
  config: ConfigTypes;
}

export interface IPollingConfig extends IGlobalRunnerConfig {
  offset?: number;
  limit?: number;
  timeout?: number;
  allowed_updates?: string[];
}

export interface IWebhookConfig extends IGlobalRunnerConfig, IGlobalWebhookConfig {
  url: string;
  certificate?: any;
  port: WebhookPorts;
  ip_address?: string;
  max_connections?: number;
  secret_token?: string;
}

export interface IRunConfig extends IGlobalWebhookConfig {
  runType?: RunTypes;
  logging?: true;
  port?: number;
}

export interface IDeleteWebhookConfig extends IGlobalWebhookConfig {}
