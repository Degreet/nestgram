import { IMessage, NextFunction, Answer, IUpdate, IMessageEntity, MiddlewareFunction } from '..';
import { MessageSubtypes } from '../types/listen-middlewares.types';

export class ListenMiddleware {
  static command(commandText: string): MiddlewareFunction {
    return function use(
      update: IUpdate,
      answer: Answer,
      next: NextFunction,
      fail: NextFunction,
    ): any {
      const message: IMessage | undefined = update.message;
      if (!message) return fail();

      if (!message.text) return fail();
      if (message.text !== `/${commandText}`) return fail();

      next();
    };
  }

  static text(text?: string): MiddlewareFunction {
    return function use(
      update: IUpdate,
      answer: Answer,
      next: NextFunction,
      fail: NextFunction,
    ): void {
      const message: IMessage | undefined = update.message;
      if (!message) return fail();

      if (!message.text) return fail();
      if (text && message.text !== text) return fail();

      next();
    };
  }

  static entity(entityType?: string): MiddlewareFunction {
    return function use(
      update: IUpdate,
      answer: Answer,
      next: NextFunction,
      fail: NextFunction,
    ): void {
      const message: IMessage | undefined = update.message;
      if (!message) return fail();

      if (!message.text) return fail();
      if (!message.entities?.find((entity: IMessageEntity): boolean => entity.type === entityType))
        return fail();

      next();
    };
  }

  static message(subtype: MessageSubtypes): MiddlewareFunction {
    return function use(
      update: IUpdate,
      answer: Answer,
      next: NextFunction,
      fail: NextFunction,
    ): void {
      if (subtype) {
        if (subtype === 'edit' && !update.edited_message) return fail();
        else if (subtype === 'post' && !update.channel_post) return fail();
        else if (subtype === 'edit_post' && !update.edited_channel_post) return fail();
      } else {
        const message: IMessage | undefined = update.message;
        if (!message) return fail();
      }

      next();
    };
  }
}
