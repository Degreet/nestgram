import {
  ArgsTypes,
  ContentTypes,
  HandlerMethod,
  IHandler,
  IMessage,
  IUpdate,
  MiddlewareFunction,
  NextFunction,
  NextLineAction,
} from '../../types';

import {
  AdminTitle,
  Alert,
  ApproveJoinRequest,
  Ban,
  ChatAction,
  ChatDescription,
  ChatPermissions,
  ChatPhoto,
  ChatStickerSet,
  ChatTitle,
  Copy,
  DeclineJoinRequest,
  Delete,
  DeleteChatPhoto,
  DeleteChatStickerSet,
  DeleteMyCommands,
  Edit,
  Forward,
  Leave,
  MenuButton,
  MessageCreator,
  MessageSend,
  MyCommands,
  MyDefaultAdminRights,
  Pin,
  Promote,
  Restrict,
  SaveFile,
  SaveProfilePhoto,
  StopPoll,
  Toast,
  Unban,
  Unpin,
} from '../Message';

import { Answer } from '../Context/Answer';
import { Filter } from '../Context/Filter';

import { FileLogger } from '../Helpers/FileLogger';
import { info } from '../../logger';
import { scopeStore } from '../Scope/ScopeStore';
import { stateStore } from '../State/StateStore';

export class Handler {
  fileLogger: FileLogger = new FileLogger(this.fileLoggingLimit);
  handlers: IHandler[] = [];
  scopes: IHandler[] = [];

  constructor(
    private readonly token: string,
    private readonly allHandlers: IHandler[],
    private readonly logging?: boolean,
    private readonly fileLogging?: boolean,
    private readonly fileLoggingLimit?: number,
  ) {
    this.handlers = allHandlers.filter((handler: IHandler): boolean => !handler.scope) || [];
    this.scopes = allHandlers.filter((handler: IHandler): boolean => !!handler.scope) || [];
  }

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
      } else if (
        resultMessageToSend instanceof ApproveJoinRequest ||
        resultMessageToSend instanceof DeclineJoinRequest
      ) {
        answerCallArgs.push(resultMessageToSend.userId, resultMessageToSend.chatId);
      } else if (resultMessageToSend instanceof SaveFile) {
        answerCallArgs.push(resultMessageToSend.path, resultMessageToSend.fileId);
      } else if (resultMessageToSend instanceof SaveProfilePhoto) {
        answerCallArgs.push(resultMessageToSend.path, resultMessageToSend.index);
      } else if (resultMessageToSend instanceof ChatStickerSet) {
        answerCallArgs.push(resultMessageToSend.stickerSetName, resultMessageToSend.chatId);
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
          resultMessageToSend.chatId,
          resultMessageToSend.untilDate,
        );
      } else if (resultMessageToSend instanceof Promote) {
        answerCallArgs.push(resultMessageToSend.permissions, resultMessageToSend.userId);
      } else if (resultMessageToSend instanceof ChatPhoto) {
        answerCallArgs.push(resultMessageToSend.photo, resultMessageToSend.chatId);
      } else if (
        resultMessageToSend instanceof DeleteChatPhoto ||
        resultMessageToSend instanceof DeleteChatStickerSet ||
        resultMessageToSend instanceof Leave
      ) {
        answerCallArgs.push(resultMessageToSend.chatId);
      } else if (resultMessageToSend instanceof MenuButton) {
        answerCallArgs.push(resultMessageToSend.menuButton, resultMessageToSend.chatId);
      } else if (resultMessageToSend instanceof MyDefaultAdminRights) {
        answerCallArgs.push(resultMessageToSend.rights, resultMessageToSend.forChannels);
      } else if (resultMessageToSend instanceof ChatTitle) {
        answerCallArgs.push(resultMessageToSend.title, resultMessageToSend.chatId);
      } else if (resultMessageToSend instanceof ChatDescription) {
        answerCallArgs.push(resultMessageToSend.description, resultMessageToSend.chatId);
      } else if (resultMessageToSend instanceof ChatPermissions) {
        answerCallArgs.push(resultMessageToSend.permissions);
      } else if (resultMessageToSend instanceof AdminTitle) {
        answerCallArgs.push(resultMessageToSend.title, resultMessageToSend.userId);
      } else if (resultMessageToSend instanceof MyCommands) {
        answerCallArgs.push(
          resultMessageToSend.commands,
          resultMessageToSend.scope,
          resultMessageToSend.languageCode,
        );
      } else if (resultMessageToSend instanceof DeleteMyCommands) {
        answerCallArgs.push(resultMessageToSend.scope, resultMessageToSend.languageCode);
      } else if (resultMessageToSend instanceof Pin) {
        answerCallArgs.push(
          resultMessageToSend.msgId,
          resultMessageToSend.chatId,
          resultMessageToSend.disableNotification,
        );
      } else if (resultMessageToSend instanceof Unpin || resultMessageToSend instanceof Delete) {
        answerCallArgs.push(resultMessageToSend.msgId, resultMessageToSend.chatId);
      } else if (resultMessageToSend instanceof StopPoll) {
        answerCallArgs.push(
          resultMessageToSend.keyboard,
          resultMessageToSend.msgId,
          resultMessageToSend.chatId,
          resultMessageToSend.moreOptions,
        );
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
        answerCallArgs.push(
          resultMessageToSend.content,
          resultMessageToSend.keyboard,
          resultMessageToSend.options,
        );
      } else if (resultMessageToSend instanceof Edit) {
        answerCallArgs.push(
          resultMessageToSend.content,
          resultMessageToSend.keyboard,
          resultMessageToSend.moreOptions,
          resultMessageToSend.msgId,
        );
      } else {
        answerCallArgs.push(resultMessageToSend);
      }
    } else {
      answerCallArgs.push(resultMessageToSend);
    }

    return [sendMethodKey, answerCallArgs];
  }

  private async getHandlers(update: IUpdate): Promise<IHandler[]> {
    const privateId: number | undefined = Filter.getPrivateId(update);
    if (!privateId) return this.handlers;

    const current: string | undefined = await scopeStore.getCurrent(privateId);
    if (!current) return this.handlers;

    const handlers: IHandler[] = this.scopes.filter(
      (scope: IHandler): boolean => scope.scope === current,
    );

    return handlers.filter((handler: IHandler): boolean => {
      const onEnter = Reflect.getMetadata('onEnterHandler', handler.controller[handler.methodKey]);
      return !!onEnter === !!update.__scopeEntered;
    });
  }

  private async handleMiddleware(
    index: number,
    update: IUpdate,
    answer: Answer,
    params: any,
    middlewareIndex: number = 0,
  ): Promise<void> {
    const handler: IHandler = (await this.getHandlers(update))[index];
    if (!handler) return;

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
        update?.chat_join_request,
      ];

      const handlerMethod: HandlerMethod = handler.controller[handler.methodKey].bind(
        handler.controller,
      );

      if (!['AsyncFunction', 'Function'].includes(handlerMethod.constructor.name)) return;
      let resultMessageToSend: MessageCreator | ContentTypes;

      const getAnswerKey: string | undefined = Reflect.getMetadata(
        'getAnswer',
        handler.controller,
        'answer',
      );

      const getStateKey: string | undefined = Reflect.getMetadata(
        'getState',
        handler.controller,
        'state',
      );

      if (getAnswerKey) handler.controller[getAnswerKey] = answer;

      if (getStateKey) {
        handler.controller[getStateKey] = await stateStore.getStore(
          Filter.getPrivateId(update),
          params,
        );
      }

      try {
        resultMessageToSend = await handlerMethod(...args);
      } catch {
        resultMessageToSend = handlerMethod(...args);
      }

      if (!resultMessageToSend) return;
      const actionsToDo: NextLineAction[] = [
        resultMessageToSend,
        ...(resultMessageToSend instanceof MessageCreator ? resultMessageToSend.otherActions : []),
      ];

      for (const actionToDo of actionsToDo) {
        if (typeof actionToDo === 'function') {
          try {
            await actionToDo();
          } catch (e: any) {
            actionToDo();
          }
        } else {
          const [sendMethodKey, answerCallArgs]: [string, any[]] =
            Handler.getAnswerInfo(actionToDo);
          await answer[sendMethodKey](...answerCallArgs);
        }
      }
    };

    const failNextFunction: NextFunction = (
      middlewareIndex?: number,
      handlerIndex?: number,
    ): void => {
      this.handleMiddleware(handlerIndex + 1, update, answer, params, 0);
      return;
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
    this.handleMiddleware(index + 1, update, answer, params);
  }

  async handleUpdate(update: IUpdate): Promise<void> {
    // log got new update
    if (this.logging) {
      info('Got new update!', `(${update.update_id})`.grey);
      if (this.fileLogging) this.fileLogger.saveLog(update);
    }

    // setup data for middlewares
    const params: any = {};
    const answer: Answer = new Answer(this.token, update, this);

    // handle update
    const handler = (await this.getHandlers(update))[0];
    if (handler) this.handleMiddleware(0, update, answer, params);
  }
}
