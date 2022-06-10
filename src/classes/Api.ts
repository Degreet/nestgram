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
  Video,
  Photo,
  Audio,
  ISendAudioOptions,
  ISendAudioFetchOptions,
  IFile,
  IGetFileFetchOptions,
  IForwardMessageOptions,
  IForwardMessageFetchOptions,
  MessageSend,
  Alert,
  Toast,
  ICopyMessageOptions,
  ICopyMessageFetchOptions,
  IMessageId,
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

      if (content instanceof MessageSend) {
        content = content.content;
      } else if (content instanceof Alert || content instanceof Toast) {
        content = content.text;
      }
    }

    if (content instanceof Media) {
      if (content.fileType === 'photo' && content instanceof Photo)
        return this.sendPhoto(chatId, content, keyboard, moreOptions);
      else if (content.fileType === 'video' && content instanceof Video)
        return this.sendVideo(chatId, content, keyboard, moreOptions);
      else if (content.fileType === 'audio' && content instanceof Audio)
        return this.sendAudio(chatId, content, keyboard, moreOptions);
      else
        throw error(
          "Media file type is not defined. Don't use Media class, use Photo, Video class instead",
        );
    }

    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();
    if (!(typeof content === 'string')) return;

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
   * @param moreOptions More options {@link ISendPhotoOptions}
   * @see https://core.telegram.org/bots/api#sendphoto
   * */
  sendPhoto(
    chatId: string | number,
    photo: Photo,
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
   * @param video Video that you want to send (you can create it using Video class {@link Video})
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ISendVideoOptions}
   * @see https://core.telegram.org/bots/api#sendvideo
   * */
  sendVideo(
    chatId: string | number,
    video: Video,
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
        ...video.resolution,
        ...moreOptions,
      }),
    );
  }

  /**
   * Sends an audio to the chat
   * @param chatId Chat ID where you want to send message. It can be chat of group/channel or ID of user
   * @param audio Audio that you want to send (you can create it using Audio class {@link Audio})
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ISendAudioOptions}
   * @see https://core.telegram.org/bots/api#sendaudio
   * */
  sendAudio(
    chatId: string | number,
    audio: Audio,
    keyboard: Keyboard | null = null,
    moreOptions: ISendAudioOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return this.callApi<IMessage, FormData>(
      'sendAudio',
      this.buildFormData<ISendAudioFetchOptions>('audio', audio, {
        chat_id: chatId,
        parse_mode: 'HTML',
        thumb: audio.thumb,
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

  /**
   * Returns info about the file
   * @param fileId File id that you want to get
   * @return {@link IFile}
   * */
  getFile(fileId: string): Promise<IFile> {
    return this.callApi<IFile, IGetFileFetchOptions>('getFile', { file_id: fileId });
  }

  /**
   * Forwards a message
   * @param msgId Id of the message you want to forward
   * @param fromChatId Chat id from you want to forward a message
   * @param toChatId Chat id you want to forward to
   * @param moreOptions More options {@link IForwardMessageOptions}
   * @see https://core.telegram.org/bots/api#forwardmessage
   * */
  forward(
    msgId: number,
    fromChatId: number | string,
    toChatId: number | string,
    moreOptions: IForwardMessageOptions = {},
  ): Promise<IMessage> {
    return this.callApi<IMessage, IForwardMessageFetchOptions>('forwardMessage', {
      chat_id: toChatId,
      from_chat_id: fromChatId,
      message_id: msgId,
      ...moreOptions,
    });
  }

  /**
   * Copies a message
   * @param msgId Id of the message you want to copy
   * @param fromChatId Chat id from you want to copy a message
   * @param toChatId Chat id you want to copy to
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ICopyMessageOptions}
   * @see https://core.telegram.org/bots/api#copymessage
   * */
  copy(
    msgId: number,
    fromChatId: number | string,
    toChatId: number | string,
    keyboard: Keyboard | null = null,
    moreOptions: ICopyMessageOptions = {},
  ): Promise<IMessageId> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return this.callApi<IMessageId, ICopyMessageFetchOptions>('copyMessage', {
      message_id: msgId,
      from_chat_id: fromChatId,
      chat_id: toChatId,
      ...moreOptions,
    });
  }
}
