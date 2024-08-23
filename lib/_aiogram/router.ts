import { Observer } from './observer';
import { Middleware, Update } from '../types';

export class Router {
  private readonly subRouters: Router[] = [];

  private parentRouter: Router;

  public readonly message = new Observer(this, 'message');

  public middlewareStack(updateType) {
    const routers: Router[] = [this];
    const middlewares: Middleware[] = [];

    let parent = this.parentRouter;

    while (parent) {
      routers.push(parent);
      parent = parent.parentRouter;
    }

    routers.reverse();

    routers.forEach((router) => {
      const observer: Observer = router[updateType];
      middlewares.push(...observer.middleware.middlewares);
    });

    return middlewares;
  }

  public includeRouter(router: Router) {
    this.subRouters.push(router);
    router.parentRouter = this;
  }

  private async propagateEvent(update: Update) {
    for (const router of this.subRouters) {
      const handlerObject = await router.searchForHandler(update, 'update');
      if (handlerObject) {
        return handlerObject;
      }
    }
  }

  public async searchForHandler(update: Update, updateType: string) {
    const observer: Observer = this[updateType];

    const handlerObject = await observer.searchForHandler(update);
    if (!handlerObject) {
      return await this.propagateEvent(update);
    }

    return {
      handlerObject,
      middlewareStack: this.middlewareStack(updateType),
    };
  }
}
