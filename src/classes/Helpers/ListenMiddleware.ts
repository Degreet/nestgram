import {
  IMessage,
  NextFunction,
  Answer,
  IUpdate,
  IMessageEntity,
  MiddlewareFunction,
  Filter,
  MessageEntityTypes,
  MediaFileTypes,
} from '../..';

import { MessageSubtypes } from '../../types/listen-middlewares.types';

export class ListenMiddleware {
  static update(): MiddlewareFunction {
    return function use(update: IUpdate, answer: Answer, params: any, next: NextFunction): any {
      next();
    };
  }

  static forward(): MiddlewareFunction {
    return function use(
      update: IUpdate,
      answer: Answer,
      params: any,
      next: NextFunction,
      fail: NextFunction,
    ): any {
      if (!update.message) return fail();
      else if (!update.message.forward_date) return fail();
      next();
    };
  }

  static joinRequest(): MiddlewareFunction {
    return function use(
      update: IUpdate,
      answer: Answer,
      params: any,
      next: NextFunction,
      fail: NextFunction,
    ): any {
      if (!update.chat_join_request) return fail();
      next();
    };
  }

  static pollEdit(isAnswer: boolean = false): MiddlewareFunction {
    return function use(
      update: IUpdate,
      answer: Answer,
      params: any,
      next: NextFunction,
      fail: NextFunction,
    ): any {
      if (!isAnswer && !update.poll) return fail();
      if (isAnswer && !update.poll_answer) return fail();
      next();
    };
  }

  static otherMedia(type: string) {
    return function use(
      update: IUpdate,
      answer: Answer,
      params: any,
      next: NextFunction,
      fail: NextFunction,
    ): any {
      const message: IMessage | undefined = Filter.getMessage(update);
      if (!message) return fail();
      else if (!message[type]) return fail();
      next();
    };
  }

  static command(commandText?: string): MiddlewareFunction {
    return function use(
      update: IUpdate,
      answer: Answer,
      params: any,
      next: NextFunction,
      fail: NextFunction,
    ): any {
      const message: IMessage | undefined = update.message;
      if (!message || !message.text) return fail();

      const entity: IMessageEntity | undefined = Filter.getEntity(update, 'bot_command');
      if (!entity) return fail();

      if (!commandText) return next();
      if (!message.text.slice(entity.offset, entity.length).startsWith(`/${commandText}`))
        return fail();

      next();
    };
  }

  static text(text?: string): MiddlewareFunction {
    return function use(
      update: IUpdate,
      answer: Answer,
      params: any,
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

  static entity(entityType?: MessageEntityTypes): MiddlewareFunction {
    return function use(
      update: IUpdate,
      answer: Answer,
      params: any,
      next: NextFunction,
      fail: NextFunction,
    ): void {
      const message: IMessage | undefined = update.message;
      if (!message) return fail();

      if (!message.text) return fail();
      if (!Filter.getEntity(update, entityType)) return fail();

      next();
    };
  }

  static message(subtype?: MessageSubtypes): MiddlewareFunction {
    return function use(
      update: IUpdate,
      answer: Answer,
      params: any,
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

  static click(buttonId: string | RegExp): MiddlewareFunction {
    return function use(
      update: IUpdate,
      answer: Answer,
      params: any,
      next: NextFunction,
      fail: NextFunction,
    ) {
      if (!update.callback_query) return fail();

      if (buttonId instanceof RegExp) {
        const match: RegExpMatchArray = update.callback_query.data.match(buttonId);
        if (!match) return fail();
        params._match = match;
      } else if (update.callback_query.data !== buttonId) return fail();

      next();
    };
  }

  static media(type?: MediaFileTypes): MiddlewareFunction {
    return function use(
      update: IUpdate,
      answer: Answer,
      params: any,
      next: NextFunction,
      fail: NextFunction,
    ): void {
      const msg: IMessage | undefined = update.message;
      if (!msg) return fail();

      if (type) {
        if (!msg[type]) return fail();
      } else {
        if (
          !msg.audio &&
          !msg.video &&
          !msg.photo &&
          !msg.video_note &&
          !msg.voice &&
          !msg.document &&
          !msg.animation
        )
          return fail();
      }

      next();
    };
  }
}
