import { ModuleMetadata, Type } from '@nestjs/common';

import type {
  RequestTransformer,
  SendThrottler,
  ThrottleOptions,
} from './request';

export interface BotOptions {
  token: string;
  /** Default `parse_mode` applied to sends that omit one. */
  parseMode?: string;
  /** Extra outbound request transformers, run after the built-ins. */
  transformers?: Type<RequestTransformer>[];
  /** Send rate-limiting: `true`/omitted = on with defaults, `false` = off, or tune it. */
  throttle?: boolean | ThrottleOptions;
  /** Replace the default throttler entirely (e.g. a distributed one). */
  throttler?: Type<SendThrottler>;
}

export interface BotAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<BotOptions>;
  useClass?: Type<BotOptions>;
  useFactory?: (...args: any[]) => Promise<BotOptions> | BotOptions;
  /** Extra outbound request transformers (static — not resolved via the factory). */
  transformers?: Type<RequestTransformer>[];
  /** Replace the default throttler (static — not resolved via the factory). */
  throttler?: Type<SendThrottler>;
}
