export type RunTypes = 'polling' | 'webhook';
export type ConfigTypes = IPollingConfig | IWebhookConfig;

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
  ip_address?: string;
  max_connections?: number;
}

export interface IRunConfig extends IGlobalWebhookConfig {
  runType?: RunTypes;
  logging?: true;
  port?: number;
}

export interface IDeleteWebhookConfig extends IGlobalWebhookConfig {}
