import { ModuleMetadata, Type } from '@nestjs/common';

export interface BotOptions {
  token: string;
  drop_pending_updates?: boolean;
}

export interface BotAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<BotOptions>;
  useClass?: Type<BotOptions>;
  useFactory?: (...args: any[]) => Promise<BotOptions> | BotOptions;
}
