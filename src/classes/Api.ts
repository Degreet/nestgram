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
  IUser,
  IAnswerCallbackQueryOptions,
  IAnswerCallbackQueryFetchOptions,
  IDefaultSendMediaConfig,
  ISendVideoFetchOptions,
  ISendVideoOptions,
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
        maxBodyLength: Infinity,
      });

      return data.result;
    } catch (e: any) {
      throw error(`.callApi error: ${e.response?.data?.description || e}`);
    }
  }

  public callApi<T = any, K = any>(method: string, config?: K): Promise<T> {
    if (!this.token) throw error(`You can't call .${method} without token`);
    return this.call<T, K>(this.token, method, config);
  }

  private static appendMediaToFormData(formData: FormData, key: string, media: Media) {
    if (media.passType === 'path') {
      formData.append(key, fs.createReadStream(media.media));
    } else {
      formData.append(key, media.media);
    }
  }

  private buildFormData<K extends IDefaultSendMediaConfig>(
    fromMediaKey: string,
    media: Media,
    config: K,
  ): FormData {
    const formData: FormData = new FormData();
    Api.appendMediaToFormData(formData, fromMediaKey, media);
    if (config.thumb) Api.appendMediaToFormData(formData, 'thumb', config.thumb);

    Object.keys(config).forEach((key: string): void => {
      const data: K[keyof K] = config[key as keyof typeof config];
      if (!data) return;
      formData.append(key, typeof data === 'object' ? JSON.stringify(data) : data);
    });

    return formData;
  }

  /**
   * Returns info about the bot
   * */
  getMe(): Promise<IUser> {
    return this.callApi<IUser>('getMe');
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

    if (content instanceof Media) {
      if (content.fileType === 'photo')
        return this.sendPhoto(chatId, content, keyboard, moreOptions);
      else if (content.fileType === 'video')
        return this.sendVideo(chatId, content, keyboard, moreOptions);
      else
        throw error(
          "Media file type is not defined. Don't use Media class, use Photo, Video class instead",
        );
    }

    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

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
   * @see https://core.telegram.org/bots/api#sendphoto
   * */
  sendPhoto(
    chatId: string | number,
    photo: Media,
    keyboard: Keyboard | null = null,
    moreOptions: ISendPhotoOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return this.callApi<IMessage, FormData>(
      'sendPhoto',
      this.buildFormData<ISendPhotoFetchOptions>('photo', photo, {
        chat_id: chatId,
        parse_mode: 'HTML',
        ...moreOptions,
      }),
    );
  }

  /**
   * Sends a video to the chat
   * @param chatId Chat ID where you want to send message. It can be chat of group/channel or ID of user
   * @param video Video that you want to send (you can create it using Photo class {@link Video})
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ISendOptions}
   * @see https://core.telegram.org/bots/api#sendvideo
   * */
  sendVideo(
    chatId: string | number,
    video: Media,
    keyboard: Keyboard | null = null,
    moreOptions: ISendVideoOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return this.callApi<IMessage, FormData>(
      'sendVideo',
      this.buildFormData<ISendVideoFetchOptions>('video', video, {
        chat_id: chatId,
        parse_mode: 'HTML',
        thumb: video.thumb,
        width: 1920,
        height: 1080,
        ...moreOptions,
      }),
    );
  }

  /**
   * Answers to the callback query (inline button click)
   * @param callback_query_id Callback query id
   * @param moreOptions More options {@link IAnswerCallbackQueryOptions}
   * @see https://core.telegram.org/bots/api#answercallbackquery
   * */
  answerCallbackQuery(
    callback_query_id: string,
    moreOptions: IAnswerCallbackQueryOptions = {},
  ): Promise<boolean> {
    return this.callApi<boolean, IAnswerCallbackQueryFetchOptions>('answerCallbackQuery', {
      callback_query_id,
      ...moreOptions,
    });
  }

  /**
   * Alert
   * @param callback_query_id Callback query id
   * @param text Alert text
   * @param moreOptions More options {@link IAnswerCallbackQueryOptions}
   * @see https://core.telegram.org/bots/api#answercallbackquery
   * */
  alert(
    callback_query_id: string,
    text: string,
    moreOptions: IAnswerCallbackQueryOptions = {},
  ): Promise<boolean> {
    return this.answerCallbackQuery(callback_query_id, { text, show_alert: true });
  }

  /**
   * Toast
   * @param callback_query_id Callback query id
   * @param text Toast text
   * @param moreOptions More options {@link IAnswerCallbackQueryOptions}
   * @see https://core.telegram.org/bots/api#answercallbackquery
   * */
  toast(
    callback_query_id: string,
    text: string,
    moreOptions: IAnswerCallbackQueryOptions = {},
  ): Promise<boolean> {
    return this.answerCallbackQuery(callback_query_id, { text, show_alert: false });
  }
}
