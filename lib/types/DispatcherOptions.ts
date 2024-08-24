import { Type } from '@nestjs/common';

import { GetUpdatesOptions } from '../methods';
import { NestgramMiddleware } from './NestgramMiddleware';

export interface DispatcherOptions extends GetUpdatesOptions {
  dropPendingUpdates?: boolean;
  startPolling?: boolean;
  routers?: Type[];
  outerMiddlewares?: Type<NestgramMiddleware>[];
}
