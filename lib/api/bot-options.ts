import { ModuleMetadata, Type } from '@nestjs/common';

import type { RequestTransformer } from './request';

export interface BotOptions {
  token: string;
  /** Default `parse_mode` applied to sends that omit one. */
  parseMode?: string;
  /** Extra outbound request transformers, run after the built-ins. */
  transformers?: Type<RequestTransformer>[];
}

export interface BotAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<BotOptions>;
  useClass?: Type<BotOptions>;
  useFactory?: (...args: any[]) => Promise<BotOptions> | BotOptions;
  /** Extra outbound request transformers (static — not resolved via the factory). */
  transformers?: Type<RequestTransformer>[];
}
