import { Logger } from '@nestjs/common';
import { Router } from './router';
import { Handler, HandlerObject, Filter, Update } from '../types';
import { MiddlewareManager } from './middleware.manager';

export class Observer {
  private readonly handlers: HandlerObject[] = [];
  private readonly filters: Filter[] = [];

  public readonly middleware = new MiddlewareManager();
  public readonly outerMiddleware = new MiddlewareManager();

  constructor(
    private readonly router: Router,
    private readonly event: string,
  ) {}

  public filter(...filters: Filter[]) {
    this.filters.push(...filters);
  }

  public register(handler: Handler, ...filters: Filter[]) {
    this.handlers.push({
      handler,
      filters: filters ?? [],
    });
  }

  public async passFilters(handler: HandlerObject, update: Update) {
    const filters = [...this.filters, ...handler.filters];

    const passedFilters = await Promise.all(
      filters.map(async (filter) => {
        const result = filter(update);
        return result instanceof Promise ? await result : result;
      }),
    );

    return passedFilters.every(Boolean);
  }

  public async searchForHandler(update: Update) {
    for (const handler of this.handlers) {
      const isFiltersPassed = await this.passFilters(handler, update);
      if (isFiltersPassed) {
        Logger.debug('Filters passed', 'Observer');
        return handler;
      }
    }
  }
}
