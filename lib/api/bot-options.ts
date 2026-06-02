import { ModuleMetadata, Type } from '@nestjs/common';

export interface BotOptions {
  token: string;
  /** Default `parse_mode` applied to sends that omit one. */
  parseMode?: string;
}

export interface BotAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<BotOptions>;
  useClass?: Type<BotOptions>;
  useFactory?: (...args: any[]) => Promise<BotOptions> | BotOptions;
}
