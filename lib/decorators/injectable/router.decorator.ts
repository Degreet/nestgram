import { SetMetadata, Type } from '@nestjs/common';

import { Metadata } from '../../enums';
import { NestgramMiddleware } from '../../types';

export interface RouterOptions {
  includes?: Type[];
  middlewares?: Type<NestgramMiddleware>[];
}

export interface AppliedRouterOptions extends RouterOptions {
  parent?: Type;
}

export const Router = (options?: RouterOptions) => {
  return SetMetadata(Metadata.ROUTER, options ?? {});
};
