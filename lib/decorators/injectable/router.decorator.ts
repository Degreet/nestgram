import { SetMetadata } from '@nestjs/common';

import { Metadata } from '../../enums';
import { RouterClass } from '../../types/DispatcherOptions';

export interface RouterOptions {
  include?: RouterClass[];
}

export interface AppliedRouterOptions extends RouterOptions {
  parent?: RouterClass;
}

export const Router = (options?: RouterOptions) => {
  return SetMetadata(Metadata.ROUTER, options ?? {});
};
