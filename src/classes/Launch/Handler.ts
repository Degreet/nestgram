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
import { MessageCreator } from '../Message';
import { log } from '../../logger';

export class Handler {
  constructor(
    private readonly token: string,
    private readonly handlers: IHandler[],
    private readonly logging?: true,
  ) {}

  getNextFunction(
    update: IUpdate,
    answer: Answer,
    params: any,
    middlewares: MiddlewareFunction[],
    index: number,
    handler: NextFunction,
    failFunction: NextFunction,
  ): NextFunction | null {
    const nextFunction: MiddlewareFunction = middlewares[++index];

    return () => {
      if (this.logging) log('blue', 'Calling next middleware', `(${update.update_id})`.grey);

      return (nextFunction || handler)(
        update,
        answer,
        params,
        this.getNextFunction(
          update,
          answer,
          params,
          middlewares,
          index,
          handler,
          failFunction.bind(null, index),
        ),
        failFunction.bind(null, index),
      );
    };
  }

  handleMiddleware(index: number, update: IUpdate, answer: Answer) {
    const handler = this.handlers[index];
    if (!handler) return;

    const params: any = {};

    const baseNextFunction: NextFunction = async (): Promise<void> => {
      if (this.logging) log('blue', 'Calling handler for update', `(${update.update_id})`.grey);

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
      await answer.send(resultMessageToSend);
    };

    const failNextFunction: NextFunction = (i: number = index): void => {
      if (this.logging)
        log('blue', 'Middleware called fail function', `(${update.update_id})`.grey);
      return this.handleMiddleware(i + 1, update, answer);
    };

    if (this.logging) log('blue', 'Calling first middleware/handler', `(${update.update_id})`.grey);

    handler.middlewares[0](
      update,
      answer,
      this.getNextFunction(
        update,
        answer,
        params,
        handler.middlewares,
        0,
        baseNextFunction,
        failNextFunction,
      ) || baseNextFunction,
      failNextFunction,
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
    if (this.logging) log('blue', 'Got new update!', `(${update.update_id})`.grey);

    // handle update
    const answer: Answer = new Answer(this.token, update);
    const handler = this.handlers[0];
    if (handler) this.handleMiddleware(0, update, answer);
  }
}
