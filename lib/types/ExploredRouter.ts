import { AppliedRouterOptions } from '../decorators';

export interface ExploredRouter {
  router: AppliedRouterOptions;
  handler: (...args: any[]) => any | Promise<any>;
}
