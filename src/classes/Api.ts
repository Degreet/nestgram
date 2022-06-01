import {
  ISendFetchOptions,
  ISendOptions,
  IMessage,
  ContentTypes,
  ISendPhotoFetchOptions,
  ISendPhotoOptions,
  IOptions,
  MessageCreator,
  Keyboard,
  IWebhookConfig,
  IDeleteWebhookConfig,
} from '..';

import { Media } from './Media';
import { error } from '../logger';

import * as FormData from 'form-data';
import axios from 'axios';
import * as fs from 'fs';

export class Api {
  constructor(private readonly token?: string) {}

  async call<T = any, K = any>(
    token: string,
    method: string,
    config?: K,
    headers?: any,
  ): Promise<T> {
    try {
      const { data } = await axios.post(`https://api.telegram.org/bot${token}/${method}`, config, {
        headers,
      });

      return data.result;
    } catch (e: any) {
      throw error(`.callApi error: ${e.response?.data?.description || e}`);
    }
  }

  private callApi<T = any, K = any>(method: string, config?: K): Promise<T> {
    if (!this.token) throw error(`You can't call .${method} without token`);
    return this.call<T, K>(this.token, method, config);
  }

  private buildFormData<K = any>(fromMediaKey: string, media: Media, config: K): FormData {
    const formData: FormData = new FormData();

    if (media.passType === 'path') {
      formData.append(fromMediaKey, fs.createReadStream(media.media));
    } else {
      formData.append(fromMediaKey, media.media);
    }

    Object.keys(config).forEach((key: string): void => {
      const data: K[keyof K] = config[key as keyof typeof config];
      formData.append(key, typeof data === 'object' ? JSON.stringify(data) : data);
    });

    return formData;
  }

  /**
   * Set ups a webhook
   * @param config Webhook config
   * */
  setWebhook(config: IWebhookConfig): Promise<boolean> {
    return this.callApi<boolean, IWebhookConfig>('setWebhook', config);
  }

  /**
   * Deletes a webhook
   * @param config Delete webhook config
   * */
  deleteWebhook(config?: IDeleteWebhookConfig): Promise<boolean> {
    return this.callApi<boolean, IDeleteWebhookConfig>('deleteWebhook', config);
  }

  /**
   * Sends a message to the chat
   * @param chatId Chat ID where you want to send message. It can be chat of group/channel or ID of user
   * @param content Message data that you want to send, some media (e.g. Photo/Message class) or string for text message
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ISendOptions}
   * @see https://core.telegram.org/bots/api#sendmessage
   * */
  send(
    chatId: string | number,
    content: MessageCreator | ContentTypes,
    keyboard: Keyboard | null = null,
    moreOptions: IOptions = {},
  ): Promise<IMessage> {
    if (content instanceof MessageCreator) {
      moreOptions = { ...moreOptions, ...content.options };
      content = content.content;
    }

    if (content instanceof Media) return this.sendPhoto(chatId, content, keyboard, moreOptions);

    if (keyboard) {
      keyboard.row();
      moreOptions.reply_markup = { [keyboard.keyboardType]: keyboard.rows };
    }

    return this.callApi<IMessage, ISendFetchOptions>('sendMessage', {
      text: content,
      chat_id: chatId,
      parse_mode: 'HTML',
      ...moreOptions,
    });
  }

  /**
   * Sends a photo to the chat
   * @param chatId Chat ID where you want to send message. It can be chat of group/channel or ID of user
   * @param photo Photo that you want to send (you can create it using Photo class {@link Photo})
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ISendOptions}
   * @see https://core.telegram.org/bots/api#sendmessage
   * */
  sendPhoto(
    chatId: string | number,
    photo: Media,
    keyboard: Keyboard | null = null,
    moreOptions: ISendPhotoOptions = {},
  ): Promise<IMessage> {
    if (keyboard) {
      keyboard.row();
      moreOptions.reply_markup = { [keyboard.keyboardType]: keyboard.rows };
    }

    return this.callApi<IMessage, FormData>(
      'sendPhoto',
      this.buildFormData<ISendPhotoFetchOptions>('photo', photo, {
        chat_id: chatId,
        parse_mode: 'HTML',
        ...moreOptions,
      }),
    );
  }
}
