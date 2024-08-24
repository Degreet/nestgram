import { ModuleMetadata, Type } from '@nestjs/common';
import { GetUpdatesOptions } from '../methods';
import { NestgramMiddleware } from './NestgramMiddleware';

export type RouterClass = new (...args: any[]) => any;

export interface DispatcherOptions extends GetUpdatesOptions {
  dropPendingUpdates?: boolean;
  startPolling?: boolean;
  routers?: RouterClass[];
  outerMiddlewares?: NestgramMiddleware[];
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
