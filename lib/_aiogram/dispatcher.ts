import { Logger } from '@nestjs/common';
import { Router } from './router';
import { Update } from '../types';
import { Bot } from './bot';
import { MiddlewareManager } from './middleware.manager';
import { Observer } from './observer';

export class Dispatcher extends Router {
  private readonly updateTypes = ['message'];

  constructor(private readonly bot?: Bot) {
    super();
  }

  private determineUpdateType(update: Update) {
    for (const updateType of this.updateTypes) {
      if (updateType in update) {
        return updateType;
      }
    }
  }

  private async processHandler(update: Update, updateType: string) {
    const data = await this.searchForHandler(update, updateType);
    if (!data) {
      Logger.debug('Handler not found', 'Dispatcher');
      return;
    }

    MiddlewareManager.execute(data.middlewareStack(updateType), update, () => {
      data.handlerObject.handler(update);
    });
  }

  public async processUpdate(update: Update) {
    const updateType = this.determineUpdateType(update);
    const observer: Observer = this[updateType];

    MiddlewareManager.execute(
      observer.outerMiddleware.middlewares,
      update,
      () => {
        return this.processHandler(update, updateType);
      },
    );
  }
}
