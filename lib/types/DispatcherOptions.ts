import { ModuleMetadata, Type } from '@nestjs/common';
import { GetUpdatesOptions } from '../methods';

export type RouterClass = new (...args: any[]) => any;

export interface DispatcherOptions extends GetUpdatesOptions {
  drop_pending_updates?: boolean;
  routers?: RouterClass[];
  start_polling?: boolean;
}

export interface DispatcherAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<DispatcherOptions>;
  useClass?: Type<DispatcherOptions>;
  useFactory?: (
    ...args: any[]
  ) => Promise<DispatcherOptions> | DispatcherOptions;
}
