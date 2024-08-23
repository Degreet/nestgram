import { Middleware, UnknownFunction, Update } from '../types';

export class MiddlewareManager {
  public readonly middlewares: Middleware[] = [];

  constructor(...middlewares: Middleware[]) {
    this.register(...middlewares);
  }

  public register(...middlewares: Middleware[]) {
    this.middlewares.push(...middlewares);
  }

  public static execute(
    middlewares: Middleware[],
    update: Update,
    callback: UnknownFunction,
    index = 0,
  ) {
    if (index < middlewares.length) {
      return middlewares[index](update, () =>
        this.execute(middlewares, update, callback, index + 1),
      );
    } else {
      return callback();
    }
  }

  // public execute(update: Update, callback: UnknownFunction, index = 0) {
  //   if (index < this.middlewares.length) {
  //     return this.middlewares[index](update, () =>
  //       this.execute(update, callback, index + 1),
  //     );
  //   } else {
  //     return callback();
  //   }
  // }
}
