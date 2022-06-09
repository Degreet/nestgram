import {
  ISendOptions,
  IMessage,
  IUpdate,
  ContentTypes,
  Keyboard,
  IAnswerCallbackQueryOptions,
  IFile,
} from '../..';

import { MessageCreator } from '../Message';
import { error } from '../../logger';
import { Filter } from './Filter';
import { Api } from '../Api';

export class Answer {
  api: Api = new Api(this.token);
  constructor(private readonly token: string, private readonly update: IUpdate) {}

  /**
   * Sends a message to the chat where got update
   * @param content Message data that you want to send, some media (e.g. Photo class) or string for text message
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ISendOptions}
   * @see https://core.telegram.org/bots/api#sendmessage
   * */
  send(
    content: MessageCreator | ContentTypes,
    keyboard: Keyboard | null = null,
    moreOptions: ISendOptions = {},
  ): Promise<IMessage> {
    const chatId: number | string | undefined = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.send(chatId, content, keyboard, moreOptions);
  }

  /**
   * Alert
   * @param text Alert text
   * @param moreOptions More options {@link IAnswerCallbackQueryOptions}
   * @see https://core.telegram.org/bots/api#answercallbackquery
   * */
  alert(text: string, moreOptions: IAnswerCallbackQueryOptions = {}): Promise<boolean> {
    const queryId: string | undefined = Filter.getCallbackQueryId(this.update);
    if (!queryId) throw error(`Can't find queryId from update`);
    return this.api.alert(queryId, text, moreOptions);
  }

  /**
   * Toast
   * @param text Toast text
   * @param moreOptions More options {@link IAnswerCallbackQueryOptions}
   * @see https://core.telegram.org/bots/api#answercallbackquery
   * */
  toast(text: string, moreOptions: IAnswerCallbackQueryOptions = {}): Promise<boolean> {
    const queryId: string | undefined = Filter.getCallbackQueryId(this.update);
    if (!queryId) throw error(`Can't find queryId from update`);
    return this.api.toast(queryId, text, moreOptions);
  }

  /**
   * Returns info about the file
   * @param fileId File id that you want to get
   * @return {@link IFile}
   * @see https://core.telegram.org/bots/api#getfile
   * */
  getFile(fileId: string): Promise<IFile> {
    return this.api.getFile(fileId);
  }
}
