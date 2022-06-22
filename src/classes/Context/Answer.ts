import {
  ISendOptions,
  IMessage,
  IUpdate,
  ContentTypes,
  Keyboard,
  IAnswerCallbackQueryOptions,
  IFile,
  IForwardMessageOptions,
  ICopyMessageOptions,
} from '../..';

import { MessageCreator } from '../Message';
import { error } from '../../logger';
import { Filter } from './Filter';
import { Api } from '../Api';

import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';

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
  ): Promise<IMessage | IMessage[]> {
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

  /**
   * Forwards got message
   * @param toChatId Chat id you want to forward to
   * @param moreOptions More options {@link IForwardMessageOptions}
   * @see https://core.telegram.org/bots/api#forwardmessage
   * */
  forward(toChatId: number | string, moreOptions?: IForwardMessageOptions) {
    const chatId: number | string | undefined = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);

    const msgId: number | undefined = Filter.getMsgId(this.update);
    if (!msgId) throw error(`Can't find msgId from update`);

    return this.api.forward(msgId, chatId, toChatId, moreOptions);
  }

  /**
   * Copies got message
   * @param toChatId Chat id you want to copy to
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ICopyMessageOptions}
   * @see https://core.telegram.org/bots/api#copymessage
   * */
  copy(toChatId: number | string, keyboard?: Keyboard | null, moreOptions?: ICopyMessageOptions) {
    const chatId: number | string | undefined = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);

    const msgId: number | undefined = Filter.getMsgId(this.update);
    if (!msgId) throw error(`Can't find msgId from update`);

    return this.api.copy(msgId, chatId, toChatId, keyboard, moreOptions);
  }

  /**
   * Saves any media was sent
   * @param path Path where you want to save the media file
   * @return true if saved success
   * */
  async saveFile(path: string): Promise<boolean> {
    const msg: IMessage = this.update.message;
    if (!msg) return false;

    const fileId: string | undefined =
      msg.audio?.file_id ||
      msg.video?.file_id ||
      (msg.photo && msg.photo[msg.photo.length - 1]?.file_id);

    if (!fileId) return false;
    const fileInfo: IFile = await this.getFile(fileId);

    try {
      axios({
        method: 'GET',
        url: `https://api.telegram.org/file/bot${this.token}/${fileInfo.file_path}`,
        responseType: 'stream',
      }).then((response: AxiosResponse): void => {
        response.data.pipe(fs.createWriteStream(path));
      });

      return true;
    } catch {
      return false;
    }
  }
}
