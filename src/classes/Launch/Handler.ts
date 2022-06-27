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

import {
  MessageCreator,
  Forward,
  Alert,
  Toast,
  MessageSend,
  Copy,
  ChatAction,
  Ban,
  Unban,
  Restrict,
  Promote,
  AdminTitle,
  SaveFile,
} from '../Message';

import { Answer } from '../Context/Answer';
import { Filter } from '../Context/Filter';

import { FileLogger } from '../Helpers/FileLogger';
import { info } from '../../logger';

export class Handler {
  fileLogger: FileLogger = new FileLogger(this.fileLoggingLimit);

  constructor(
    private readonly token: string,
    private readonly handlers: IHandler[],
    private readonly logging?: boolean,
    private readonly fileLogging?: boolean,
    private readonly fileLoggingLimit?: number,
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

    return () =>
      (nextFunction || handler)(
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
  }

  static getAnswerInfo(resultMessageToSend: any): [string, any[]] {
    let sendMethodKey: string = 'send';
    const answerCallArgs: any[] = [];

    if (resultMessageToSend instanceof MessageCreator) {
      sendMethodKey = resultMessageToSend.sendType;

      if (resultMessageToSend instanceof Alert || resultMessageToSend instanceof Toast) {
        answerCallArgs.push(resultMessageToSend.text, resultMessageToSend.options);
      } else if (resultMessageToSend instanceof ChatAction) {
        answerCallArgs.push(resultMessageToSend.action);
      } else if (resultMessageToSend instanceof SaveFile) {
        answerCallArgs.push(resultMessageToSend.path, resultMessageToSend.fileId);
      } else if (resultMessageToSend instanceof Ban) {
        answerCallArgs.push(
          resultMessageToSend.untilDate,
          resultMessageToSend.revokeMessages,
          resultMessageToSend.userId,
        );
      } else if (resultMessageToSend instanceof Unban) {
        answerCallArgs.push(resultMessageToSend.onlyIfBanned, resultMessageToSend.userId);
      } else if (resultMessageToSend instanceof Restrict) {
        answerCallArgs.push(
          resultMessageToSend.permissions,
          resultMessageToSend.userId,
          resultMessageToSend.untilDate,
        );
      } else if (resultMessageToSend instanceof Promote) {
        answerCallArgs.push(resultMessageToSend.permissions, resultMessageToSend.userId);
      } else if (resultMessageToSend instanceof AdminTitle) {
        answerCallArgs.push(resultMessageToSend.title, resultMessageToSend.userId);
      } else if (resultMessageToSend instanceof Forward || resultMessageToSend instanceof Copy) {
        if (resultMessageToSend instanceof Forward)
          answerCallArgs.push(resultMessageToSend.toChatId, resultMessageToSend.options);
        else if (resultMessageToSend instanceof Copy)
          answerCallArgs.push(
            resultMessageToSend.toChatId,
            resultMessageToSend.keyboard,
            resultMessageToSend.options,
          );
      } else if (resultMessageToSend instanceof MessageSend) {
        sendMethodKey = 'send';

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

    return [sendMethodKey, answerCallArgs];
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
        message?.location,
        message?.contact,
        message?.venue,
        message?.poll || update?.poll,
        message?.dice,
        message?.chat,
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
      const messagesToSend: (MessageCreator | ContentTypes)[] = [
        resultMessageToSend,
        ...(resultMessageToSend instanceof MessageCreator ? resultMessageToSend.otherMessages : []),
      ];

      for (const messageToSend of messagesToSend) {
        const [sendMethodKey, answerCallArgs]: [string, any[]] =
          Handler.getAnswerInfo(messageToSend);
        await answer[sendMethodKey](...answerCallArgs);
      }
    };

    const failNextFunction: NextFunction = (
      middlewareIndex?: number,
      handlerIndex?: number,
    ): void => {
      if (handler.middlewares[middlewareIndex]) {
        return this.handleMiddleware(handlerIndex, update, answer, middlewareIndex);
      }

      return this.handleMiddleware(handlerIndex + 1, update, answer, 0);
    };

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
    if (this.logging) {
      info('Got new update!', `(${update.update_id})`.grey);
      if (this.fileLogging) this.fileLogger.saveLog(update);
    }

    // handle update
    const answer: Answer = new Answer(this.token, update);
    const handler = this.handlers[0];
    if (handler) this.handleMiddleware(0, update, answer);
  }
}
