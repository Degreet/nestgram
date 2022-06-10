import {
  ArgsTypes,
  HandlerMethod,
  IHandler,
  ContentTypes,
  IMessage,
  IUpdate,
  MiddlewareFunction,
  NextFunction,
} from '../../types';

import { Answer } from '../Context/Answer';
import { Filter } from '../Context/Filter';

import { MessageCreator, Forward, Alert, Toast, MessageSend } from '../Message';
import { info } from '../../logger';

export class Handler {
  constructor(
    private readonly token: string,
    private readonly handlers: IHandler[],
    private readonly logging?: true,
  ) {}

  private getNextFunction(
    update: IUpdate,
    answer: Answer,
    params: any,
    middlewares: MiddlewareFunction[],
    middlewareIndex: number,
    handlerIndex: number,
    handler: NextFunction,
    failFunction: NextFunction,
  ): NextFunction | null {
    const nextFunction: MiddlewareFunction = middlewares[++middlewareIndex];

    return () => {
      if (this.logging) info('Calling next middleware', `(${update.update_id})`.grey);

      return (nextFunction || handler)(
        update,
        answer,
        params,
        this.getNextFunction(
          update,
          answer,
          params,
          middlewares,
          middlewareIndex,
          handlerIndex,
          handler,
          failFunction.bind(null, middlewareIndex, handlerIndex),
        ),
        failFunction.bind(null, middlewareIndex, handlerIndex),
      );
    };
  }

  private handleMiddleware(
    index: number,
    update: IUpdate,
    answer: Answer,
    middlewareIndex: number = 0,
  ) {
    const handler = this.handlers[index];
    if (!handler) return;

    const params: any = {};

    const baseNextFunction: NextFunction = async (): Promise<void> => {
      if (this.logging) info('Calling handler for update', `(${update.update_id})`.grey);

      const message: IMessage | undefined = Filter.getMessage(update);
      const commandParams: string[] = Filter.getCommandParams(update);

      const args: ArgsTypes = [
        update,
        message,
        message?.text,
        answer,
        message?.entities,
        commandParams,
        params,
        message?.from,
        message?.from?.id,
      ];

      const handlerMethod: HandlerMethod = handler.controller[handler.methodKey].bind(
        handler.controller,
      );

      if (!['AsyncFunction', 'Function'].includes(handlerMethod.constructor.name)) return;
      let resultMessageToSend: MessageCreator | ContentTypes;

      try {
        resultMessageToSend = await handlerMethod(...args);
      } catch {
        resultMessageToSend = handlerMethod(...args);
      }

      if (!resultMessageToSend) return;
      let sendMethodKey: string = 'send';
      const answerCallArgs: any[] = [];

      if (resultMessageToSend instanceof MessageCreator) {
        if (resultMessageToSend instanceof Alert || resultMessageToSend instanceof Toast) {
          sendMethodKey = resultMessageToSend.sendType;
          answerCallArgs.push(resultMessageToSend.text, resultMessageToSend.options);
        } else if (resultMessageToSend instanceof Forward) {
          sendMethodKey = 'forward';
          answerCallArgs.push(resultMessageToSend.toChatId, resultMessageToSend.options);
        } else if (resultMessageToSend instanceof MessageSend) {
          answerCallArgs.push(
            resultMessageToSend.content,
            resultMessageToSend.keyboard,
            resultMessageToSend.options,
          );
        } else {
          answerCallArgs.push(resultMessageToSend);
        }
      } else {
        answerCallArgs.push(resultMessageToSend);
      }

      await answer[sendMethodKey](...answerCallArgs);
    };

    const failNextFunction: NextFunction = (
      middlewareIndex?: number,
      handlerIndex?: number,
    ): void => {
      if (this.logging) info('Middleware called fail function', `(${update.update_id})`.grey);

      if (handler.middlewares[middlewareIndex]) {
        return this.handleMiddleware(handlerIndex, update, answer, middlewareIndex);
      }

      return this.handleMiddleware(handlerIndex + 1, update, answer, 0);
    };

    if (this.logging) info('Calling first middleware/handler', `(${update.update_id})`.grey);

    handler.middlewares[middlewareIndex](
      update,
      answer,
      params,
      this.getNextFunction(
        update,
        answer,
        params,
        handler.middlewares,
        middlewareIndex,
        index,
        baseNextFunction,
        failNextFunction,
      ) || baseNextFunction,
      failNextFunction.bind(null, middlewareIndex + 1, index),
    );

    const isContinue: boolean | undefined = Reflect.getMetadata(
      'continue',
      handler.controller[handler.methodKey],
    );

    if (!isContinue) return;
    this.handleMiddleware(index + 1, update, answer);
  }

  async handleUpdate(update: IUpdate): Promise<void> {
    // log got new update
    if (this.logging) info('Got new update!', `(${update.update_id})`.grey);

    // handle update
    const answer: Answer = new Answer(this.token, update);
    const handler = this.handlers[0];
    if (handler) this.handleMiddleware(0, update, answer);
  }
}
