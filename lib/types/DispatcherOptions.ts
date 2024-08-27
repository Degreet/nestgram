import { ModuleMetadata, Type } from '@nestjs/common';

import { GetUpdatesOptions } from '../methods';
import { NestgramMiddleware } from './NestgramMiddleware';

export interface DispatcherOptions
  extends GetUpdatesOptions,
    Pick<ModuleMetadata, 'imports' | 'providers'> {
  dropPendingUpdates?: boolean;
  startPolling?: boolean;
  routers?: Type[];
  outerMiddlewares?: Type<NestgramMiddleware>[];
}
