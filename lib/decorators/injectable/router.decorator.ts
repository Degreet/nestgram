import { SetMetadata } from '@nestjs/common';

import { Metadata } from '../../enums';
import { RouterClass } from '../../types/DispatcherOptions';
import { NestgramMiddleware } from '../../types/NestgramMiddleware';

export interface RouterOptions {
  includes?: RouterClass[];
  middlewares?: NestgramMiddleware[];
}

export interface AppliedRouterOptions extends RouterOptions {
  parent?: RouterClass;
}

export const Router = (options?: RouterOptions) => {
  return SetMetadata(Metadata.ROUTER, options ?? {});
};
