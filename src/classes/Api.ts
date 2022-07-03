import {
  Alert,
  Audio,
  ContentTypes,
  Document,
  IAnswerCallbackQueryFetchOptions,
  IAnswerCallbackQueryOptions,
  ICopyMessageFetchOptions,
  ICopyMessageOptions,
  IDefaultSendMediaConfig,
  IDeleteWebhookConfig,
  IFile,
  IForwardMessageFetchOptions,
  IForwardMessageOptions,
  IGetFileFetchOptions,
  IMessage,
  IMessageId,
  InputMediaTypes,
  InputSupportedMedia,
  ISendAnimationFetchOptions,
  ISendAnimationOptions,
  ISendAudioFetchOptions,
  ISendAudioOptions,
  ISendDocumentFetchOptions,
  ISendDocumentOptions,
  ISendFetchOptions,
  ISendLocationFetchOptions,
  ISendLocationOptions,
  ISendMediaGroupFetchOptions,
  ISendMediaGroupOptions,
  ISendPhotoFetchOptions,
  ISendPhotoOptions,
  ISendVideoFetchOptions,
  ISendVideoNoteFetchOptions,
  ISendVideoNoteOptions,
  ISendVideoOptions,
  ISendVoiceFetchOptions,
  ISendVoiceOptions,
  IUser,
  IWebhookConfig,
  Keyboard,
  MediaFileTypes,
  MediaGroup,
  MessageCreator,
  MessageSend,
  Photo,
  Toast,
  Video,
  Voice,
  Location,
  IStopMessageLiveLocationOptions,
  IStopMessageLiveLocationFetchOptions,
  ISendVenueOptions,
  ISendVenueFetchOptions,
  Venue,
  Contact,
  Poll,
  Dice,
  ISendContactOptions,
  ISendContactFetchOptions,
  ISendPollOptions,
  ISendPollFetchOptions,
  DiceEmojis,
  ISendDiceOptions,
  ISendDiceFetchOptions,
  ChatActions,
  ISendChatActionFetchOptions,
  IGetUserProfilePhotosFetchOptions,
  IUserProfilePhotos,
  IWebhookInfo,
  IBanChatMemberFetchOptions,
  IUnbanChatMemberFetchOptions,
  IChatPermissions,
  IRestrictChatMemberFetchOptions,
  IPromoteChatPermissions,
  IPromoteChatMemberFetchOptions,
  ISetChatAdministratorCustomTitle,
  IBanChatSenderChatFetchOptions,
  ISetChatPermissionsFetchOptions,
  IExportChatInviteLinkFetchOptions,
  ICreateChatInviteLinkOptions,
  ICreateChatInviteLinkFetchOptions,
  IChatInviteLink,
  IRevokeChatInviteLinkFetchOptions,
  IApproveChatJoinRequestFetchOptions,
  IDeclineChatJoinRequestFetchOptions,
  ISetChatPhotoFetchOptions,
  IDeleteChatPhotoFetchOptions,
  ISetChatTitleFetchOptions,
  ISetChatDescriptionFetchOptions,
  IPinChatMessageFetchOptions,
  IUnpinChatMessageFetchOptions,
  IUnpinAllChatMessagesFetchOptions,
  ILeaveChatFetchOptions,
  IGetChatFetchOptions,
  IChat,
  ChatMember,
  IGetChatAdministratorsFetchOptions,
  IGetChatMemberCountFetchOptions,
  IGetChatMemberFetchOptions,
  ISetChatStickerSetFetchOptions,
  IDeleteChatStickerSetFetchOptions,
  IBotCommand,
  BotCommandScope,
  ISetMyCommandsFetchOptions,
  IDeleteMyCommandsFetchOptions,
  IGetMyCommandsFetchOptions,
  ISetChatMenuButtonFetchOptions,
  IGetChatMenuButtonFetchOptions,
  IChatAdministratorRights,
  ISetMyDefaultAdministratorRightsFetchOptions,
  IGetMyDefaultAdministratorRightsFetchOptions,
  IEditTextOptions,
  IEditTextFetchOptions,
  EditContentTypes,
  IEditCaptionOptions,
  IEditCaptionFetchOptions,
  SendOptions,
  IEditMediaFetchOptions,
  IEditKeyboardFetchOptions,
  IEditKeyboardOptions,
  IStopPollOptions,
  IStopPollFetchOptions,
  IPoll,
  IDeleteMessageFetchOptions,
} from '..';

import { mediaCache } from './Media/MediaCache';
import { Animation, Media, VideoNote } from './Media';
import { error } from '../logger';

import axios from 'axios';
import * as FormData from 'form-data';
import * as fs from 'fs';
import { BotMenuButton } from '../types/menu-button.types';
import { Caption } from './Marks';
import { MarkCreator } from './Marks/MarkCreator';

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

  private static appendMediaToFormData(formData: FormData, key: string, media: string | Media) {
    if (typeof media === 'string') {
      formData.append(key, media);
    } else if (media.passType === 'path') {
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

    Api.appendMediaToFormData(
      formData,
      fromMediaKey,
      media.useCache ? mediaCache.getMediaFileId(media.media) || media : media,
    );

    if (config.thumb) {
      Api.appendMediaToFormData(
        formData,
        'thumb',
        media.useCache
          ? mediaCache.getMediaFileId(config.thumb.media) || config.thumb
          : config.thumb,
      );
    }

    Object.keys(config).forEach((key: string): void => {
      const data: K[keyof K] = config[key as keyof typeof config];
      if (!data) return;
      formData.append(key, typeof data === 'object' ? JSON.stringify(data) : data);
    });

    return formData;
  }

  private buildAttachFormData<K>(config: K): FormData {
    const formData: FormData = new FormData();

    Object.keys(config).forEach((key: string): void => {
      const data: K[keyof K] = config[key as keyof typeof config];
      if (!data) return;
      formData.append(key, typeof data === 'object' ? JSON.stringify(data) : data);
    });

    return formData;
  }

  private static saveMediaFileId(
    path: string,
    mediaKey: MediaFileTypes,
    message: IMessage,
  ): IMessage {
    if (!mediaCache.getMediaFileId(path)) {
      let mediaFileInfo: any & { file_id: string } = message[mediaKey];
      if (mediaKey === 'photo') mediaFileInfo = mediaFileInfo[mediaFileInfo.length - 1];
      mediaCache.saveMediaFileId(path, mediaFileInfo.file_id);
    }

    return message;
  }

  /**
   * Returns info about the bot
   * */
  getMe(): Promise<IUser> {
    return this.callApi<IUser>('getMe');
  }

  /**
   * Log out
   * @see https://core.telegram.org/bots/api#logout
   * */
  logOut(): Promise<true> {
    return this.callApi<true>('logOut');
  }

  /**
   * Close
   * @see https://core.telegram.org/bots/api#close
   * */
  close(): Promise<true> {
    return this.callApi<true>('close');
  }

  /**
   * Webhook info
   * @see https://core.telegram.org/bots/api#getwebhookinfo
   * @return Webhook info
   * */
  getWebhookInfo(): Promise<IWebhookInfo> {
    return this.callApi<IWebhookInfo>('getWebhookInfo');
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
   * @param chatId Chat ID where you want to send message. It can be id of group/channel or ID of user
   * @param content Message data that you want to send, some media (e.g. Photo/Message class) or string for text message
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link SendOptions}
   * @see https://core.telegram.org/bots/api#sendmessage
   * */
  send(
    chatId: string | number,
    content: MessageCreator | ContentTypes,
    keyboard: Keyboard | null = null,
    moreOptions: SendOptions = {},
  ): Promise<IMessage | IMessage[]> {
    if (content instanceof MessageCreator) {
      moreOptions = { ...moreOptions, ...content.options };

      if (content instanceof MessageSend) {
        content = content.content;
      } else if (content instanceof Alert || content instanceof Toast) {
        content = content.text;
      }
    }

    if (content instanceof Media) {
      if (content instanceof Photo) return this.sendPhoto(chatId, content, keyboard, moreOptions);
      else if (content instanceof Animation)
        return this.sendAnimation(chatId, content, keyboard, moreOptions);
      else if (content instanceof Video)
        return this.sendVideo(chatId, content, keyboard, moreOptions);
      else if (content instanceof VideoNote)
        return this.sendVideoNote(chatId, content, keyboard, moreOptions);
      else if (content instanceof Audio)
        return this.sendAudio(chatId, content, keyboard, moreOptions);
      else if (content instanceof Document)
        return this.sendDocument(chatId, content, keyboard, moreOptions);
      else if (content instanceof Voice)
        return this.sendVoice(chatId, content, keyboard, moreOptions);
      else if (content instanceof MediaGroup)
        return this.sendMediaGroup(chatId, content.mediaGroup, moreOptions);
      else if (content instanceof Location)
        return this.sendLocation(chatId, content.latitude, content.longitude, keyboard, {
          ...moreOptions,
          ...(content.options || {}),
        });
      else if (content instanceof Venue)
        return this.sendVenue(
          chatId,
          content.latitude,
          content.longitude,
          content.title,
          content.address,
          keyboard,
          { ...moreOptions, ...(content.options || {}) },
        );
      else if (content instanceof Contact)
        return this.sendContact(
          chatId,
          content.phone,
          content.firstName,
          content.lastName,
          keyboard,
          { ...moreOptions, ...(content.options || {}) },
        );
      else if (content instanceof Poll)
        return this.sendPoll(chatId, content.question, content.options, keyboard, {
          ...moreOptions,
          ...(content.moreOptions || {}),
        });
      else if (content instanceof Dice)
        return this.sendDice(chatId, content.emoji, keyboard, {
          ...moreOptions,
          ...(content.moreOptions || {}),
        });
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
   * @param chatId Chat ID where you want to send message. It can be id of group/channel or ID of user
   * @param photo Photo that you want to send (you can create it using Photo class {@link Photo})
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ISendPhotoOptions}
   * @see https://core.telegram.org/bots/api#sendphoto
   * */
  async sendPhoto(
    chatId: string | number,
    photo: Photo,
    keyboard: Keyboard | null = null,
    moreOptions: ISendPhotoOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return Api.saveMediaFileId(
      photo.media,
      'photo',
      await this.callApi<IMessage, FormData>(
        'sendPhoto',
        this.buildFormData<ISendPhotoFetchOptions>('photo', photo, {
          chat_id: chatId,
          parse_mode: 'HTML',
          ...moreOptions,
        }),
      ),
    );
  }

  /**
   * Sends a video to the chat
   * @param chatId Chat ID where you want to send message. It can be id of group/channel or ID of user
   * @param video Video that you want to send (you can create it using Video class {@link Video})
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ISendVideoOptions}
   * @see https://core.telegram.org/bots/api#sendvideo
   * */
  async sendVideo(
    chatId: string | number,
    video: Video,
    keyboard: Keyboard | null = null,
    moreOptions: ISendVideoOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return Api.saveMediaFileId(
      video.media,
      'video',
      await this.callApi<IMessage, FormData>(
        'sendVideo',
        this.buildFormData<ISendVideoFetchOptions>('video', video, {
          chat_id: chatId,
          parse_mode: 'HTML',
          thumb: video.thumb,
          ...video.resolution,
          ...moreOptions,
        }),
      ),
    );
  }

  /**
   * Sends a video note to the chat
   * @param chatId Chat ID where you want to send message. It can be id of group/channel or ID of user
   * @param videoNote Video note that you want to send (you can create it using Video class {@link VideoNote})
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ISendVideoNoteOptions}
   * @see https://core.telegram.org/bots/api#sendvideonote
   * */
  async sendVideoNote(
    chatId: string | number,
    videoNote: VideoNote,
    keyboard: Keyboard | null = null,
    moreOptions: ISendVideoNoteOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return Api.saveMediaFileId(
      videoNote.media,
      'video_note',
      await this.callApi<IMessage, FormData>(
        'sendVideoNote',
        this.buildFormData<ISendVideoNoteFetchOptions>('video_note', videoNote, {
          chat_id: chatId,
          parse_mode: 'HTML',
          thumb: videoNote.thumb,
          ...moreOptions,
        }),
      ),
    );
  }

  /**
   * Sends an audio to the chat
   * @param chatId Chat ID where you want to send message. It can be id of group/channel or ID of user
   * @param audio Audio that you want to send (you can create it using Audio class {@link Audio})
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ISendAudioOptions}
   * @see https://core.telegram.org/bots/api#sendaudio
   * */
  async sendAudio(
    chatId: string | number,
    audio: Audio,
    keyboard: Keyboard | null = null,
    moreOptions: ISendAudioOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return Api.saveMediaFileId(
      audio.media,
      'audio',
      await this.callApi<IMessage, FormData>(
        'sendAudio',
        this.buildFormData<ISendAudioFetchOptions>('audio', audio, {
          chat_id: chatId,
          parse_mode: 'HTML',
          thumb: audio.thumb,
          ...moreOptions,
        }),
      ),
    );
  }

  /**
   * Sends a voice message to the chat
   * @param chatId Chat ID where you want to send message. It can be id of group/channel or ID of user
   * @param voice Voice that you want to send (you can create it using Audio class {@link Voice})
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ISendVoiceOptions}
   * @see https://core.telegram.org/bots/api#sendaudio
   * */
  async sendVoice(
    chatId: string | number,
    voice: Voice,
    keyboard: Keyboard | null = null,
    moreOptions: ISendVoiceOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return Api.saveMediaFileId(
      voice.media,
      'voice',
      await this.callApi<IMessage, FormData>(
        'sendVoice',
        this.buildFormData<ISendVoiceFetchOptions>('voice', voice, {
          chat_id: chatId,
          parse_mode: 'HTML',
          ...moreOptions,
        }),
      ),
    );
  }

  /**
   * Sends a document to the chat
   * @param chatId Chat ID where you want to send message. It can be id of group/channel or ID of user
   * @param document Document that you want to send (you can create it using {@link Document}) class
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ISendDocumentOptions}
   * @see https://core.telegram.org/bots/api#senddocument
   * */
  async sendDocument(
    chatId: string | number,
    document: Document,
    keyboard: Keyboard | null = null,
    moreOptions: ISendDocumentOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return Api.saveMediaFileId(
      document.media,
      'document',
      await this.callApi<IMessage, FormData>(
        'sendDocument',
        this.buildFormData<ISendDocumentFetchOptions>('document', document, {
          chat_id: chatId,
          parse_mode: 'HTML',
          thumb: document.thumb,
          ...moreOptions,
        }),
      ),
    );
  }

  /**
   * Sends an animation to the chat
   * @param chatId Chat ID where you want to send message. It can be id of group/channel or ID of user
   * @param animation Animation that you want to send (you can create it using {@link Animation}) class
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link ISendAnimationOptions}
   * @see https://core.telegram.org/bots/api#sendanimation
   * */
  async sendAnimation(
    chatId: string | number,
    animation: Animation,
    keyboard: Keyboard | null = null,
    moreOptions: ISendAnimationOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return Api.saveMediaFileId(
      animation.media,
      'animation',
      await this.callApi<IMessage, FormData>(
        'sendAnimation',
        this.buildFormData<ISendAnimationFetchOptions>('animation', animation, {
          chat_id: chatId,
          parse_mode: 'HTML',
          thumb: animation.thumb,
          ...animation.resolution,
          ...moreOptions,
        }),
      ),
    );
  }

  /**
   * Sends a media group to the chat
   * @param chatId Chat ID where you want to send message. It can be id of group/channel or ID of user
   * @param mediaGroup Media group that you want to send (you can create it using {@link MediaGroup}) class
   * @param moreOptions More options {@link ISendMediaGroupOptions}
   * @see https://core.telegram.org/bots/api#sendmediagroup
   * */
  async sendMediaGroup(
    chatId: string | number,
    mediaGroup: InputSupportedMedia[],
    moreOptions: ISendMediaGroupOptions = {},
  ): Promise<IMessage[]> {
    const formData: FormData = this.buildAttachFormData<ISendMediaGroupFetchOptions>({
      chat_id: chatId,
      media: mediaGroup.map((media: InputSupportedMedia, index: number): InputMediaTypes => {
        return {
          type: media.type,
          media: mediaCache.getMediaFileId(media.media) || `attach://${index}`,
          ...(media.thumb
            ? { thumb: mediaCache.getMediaFileId(media.thumb.media) || `attach://${index}_thumb` }
            : {}),
          ...(media instanceof Video ? media.resolution : {}),
          ...(media.options || {}),
        };
      }),
      ...moreOptions,
    });

    mediaGroup.forEach((media: InputSupportedMedia, index: number): void => {
      if (!mediaCache.getMediaFileId(media.media))
        Api.appendMediaToFormData(formData, index.toString(), media);

      if (media.thumb) {
        if (!mediaCache.getMediaFileId(media.thumb.media))
          Api.appendMediaToFormData(formData, `${index.toString()}_thumb`, media.thumb);
      }
    });

    const sentMessages: IMessage[] = await this.callApi<IMessage[], FormData>(
      'sendMediaGroup',
      formData,
    );

    for (const sentMessage of sentMessages) {
      const media: Media = mediaGroup[sentMessages.indexOf(sentMessage)];
      // @ts-ignore
      Api.saveMediaFileId(media.media, media.type, sentMessage);
    }

    return sentMessages;
  }

  /**
   * Sends a location to the chat
   * @param chatId Chat ID where you want to send message. It can be id of group/channel or ID of user
   * @param latitude Latitude of the location
   * @param longitude Longitude of the location
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions Message options {@link ISendLocationOptions}
   * @see https://core.telegram.org/bots/api#sendlocation
   * */
  sendLocation(
    chatId: number | string,
    latitude: number,
    longitude: number,
    keyboard: Keyboard | null = null,
    moreOptions: ISendLocationOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return this.callApi<IMessage, ISendLocationFetchOptions>('sendLocation', {
      chat_id: chatId,
      latitude,
      longitude,
      ...moreOptions,
    });
  }

  /**
   * Sends a venue to the chat
   * @param chatId Chat ID where you want to send venue. It can be id of group/channel or ID of user
   * @param latitude Latitude of the location
   * @param longitude Longitude of the location
   * @param title Venue title
   * @param address Venue address
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions Message options {@link ISendVenueOptions}
   * @see https://core.telegram.org/bots/api#sendvenue
   * */
  sendVenue(
    chatId: number | string,
    latitude: number,
    longitude: number,
    title: string,
    address: string,
    keyboard: Keyboard | null = null,
    moreOptions: ISendVenueOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return this.callApi<IMessage, ISendVenueFetchOptions>('sendVenue', {
      chat_id: chatId,
      latitude,
      longitude,
      title,
      address,
      ...moreOptions,
    });
  }

  /**
   * Sends a contact to the chat
   * @param chatId Chat ID where you want to send a contact. It can be id of group/channel or ID of the user
   * @param phone Contact phone
   * @param firstName Contact first name
   * @param lastName Contact last name (optional)
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions Message options {@link ISendContactOptions}
   * @see https://core.telegram.org/bots/api#sendcontact
   * */
  sendContact(
    chatId: number | string,
    phone: string,
    firstName: string,
    lastName: string | null = null,
    keyboard: Keyboard | null = null,
    moreOptions: ISendContactOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return this.callApi<IMessage, ISendContactFetchOptions>('sendContact', {
      chat_id: chatId,
      phone_number: phone,
      first_name: firstName,
      last_name: lastName,
      ...moreOptions,
    });
  }

  /**
   * Sends a poll to the chat
   * @param chatId Chat ID where you want to send a poll. It can be id of group/channel or ID of the user
   * @param question Poll question
   * @param options Poll options (2-10 strings 1-100 characters each)
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions Message options {@link ISendPollOptions}
   * @see https://core.telegram.org/bots/api#sendpoll
   * */
  sendPoll(
    chatId: number | string,
    question: string,
    options: string[],
    keyboard: Keyboard | null = null,
    moreOptions: ISendPollOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return this.callApi<IMessage, ISendPollFetchOptions>('sendPoll', {
      chat_id: chatId,
      question,
      options,
      ...moreOptions,
    });
  }

  /**
   * Sends dice to the chat
   * @param chatId Chat ID where you want to send dice. It can be id of group/channel or ID of the user
   * @param emoji Dice emoji {@link DiceEmojis}
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions Message options {@link ISendDiceOptions}
   * @see https://core.telegram.org/bots/api#senddice
   * */
  sendDice(
    chatId: number | string,
    emoji: DiceEmojis | null = null,
    keyboard: Keyboard | null = null,
    moreOptions: ISendDiceOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return this.callApi<IMessage, ISendDiceFetchOptions>('sendDice', {
      chat_id: chatId,
      emoji: emoji || '🎲',
      ...moreOptions,
    });
  }

  /**
   * Edit a message
   * @param chatId Chat ID in which message you want to edit is located
   * @param msgId Message ID you want to edit
   * @param content Content you want to edit (string or Caption class)
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link IEditTextOptions}
   * @see https://core.telegram.org/bots/api#editmessagetext
   * */
  edit(
    chatId: number | string | null,
    msgId: number | null,
    content: EditContentTypes,
    keyboard?: Keyboard | null,
    moreOptions: IEditTextOptions = {},
  ): Promise<IMessage | IPoll> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    if (content instanceof Media) {
      return this.editMedia(chatId, msgId, content, keyboard, moreOptions);
    } else if (content instanceof Keyboard) {
      return this.editKeyboard(chatId, msgId, content, moreOptions);
    } else if (content instanceof MarkCreator) {
      if (content instanceof Caption) {
        return this.editCaption(chatId, msgId, content.caption, keyboard, moreOptions);
      } else return;
    }

    return this.callApi<IMessage, IEditTextFetchOptions>('editMessageText', {
      chat_id: chatId,
      message_id: msgId,
      text: content,
      ...(moreOptions || {}),
    });
  }

  /**
   * Edit a message caption
   * @param chatId Chat ID in which message you want to edit is located
   * @param msgId Message ID you want to edit
   * @param caption Caption you want to edit
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link IEditTextOptions}
   * @see https://core.telegram.org/bots/api#editmessagecaption
   * */
  editCaption(
    chatId: number | string | null,
    msgId: number | null,
    caption: string,
    keyboard?: Keyboard,
    moreOptions: IEditCaptionOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return this.callApi<IMessage, IEditCaptionFetchOptions>('editMessageCaption', {
      chat_id: chatId,
      message_id: msgId,
      caption,
      ...(moreOptions || {}),
    });
  }

  /**
   * Edit a message keyboard
   * @param chatId Chat ID in which message you want to edit is located
   * @param msgId Message ID you want to edit
   * @param keyboard Keyboard you want to edit
   * @param moreOptions More options {@link IEditTextOptions}
   * @see https://core.telegram.org/bots/api#editmessagereplymarkup
   * */
  editKeyboard(
    chatId: number | string | null,
    msgId: number | null,
    keyboard?: Keyboard,
    moreOptions: IEditKeyboardOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return this.callApi<IMessage, IEditKeyboardFetchOptions>('editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: msgId,
      ...(moreOptions || {}),
    });
  }

  /**
   * Edit a message media
   * @param chatId Chat ID in which message you want to edit is located
   * @param msgId Message ID you want to edit
   * @param media Media you want to edit
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link IEditTextOptions}
   * @see https://core.telegram.org/bots/api#editmessagemedia
   * */
  async editMedia(
    chatId: number | string | null,
    msgId: number | null,
    media: Media,
    keyboard?: Keyboard,
    moreOptions: IEditCaptionOptions = {},
  ): Promise<IMessage> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    const formData: FormData = this.buildAttachFormData<IEditMediaFetchOptions>({
      chat_id: chatId,
      message_id: msgId,
      media: {
        type: media.type,
        media: mediaCache.getMediaFileId(media.media) || `attach://media`,
        ...(media.thumb
          ? { thumb: mediaCache.getMediaFileId(media.thumb.media) || `attach://thumb` }
          : {}),
        ...(media instanceof Video ? media.resolution : {}),
        ...(media.options || {}),
      },
      ...moreOptions,
    });

    if (!mediaCache.getMediaFileId(media.media))
      Api.appendMediaToFormData(formData, 'media', media);

    if (media.thumb) {
      if (!mediaCache.getMediaFileId(media.thumb.media))
        Api.appendMediaToFormData(formData, 'thumb', media.thumb);
    }

    const sentMessage: IMessage = await this.callApi<IMessage, FormData>(
      'editMessageMedia',
      formData,
    );

    // @ts-ignore
    Api.saveMediaFileId(media.media, media.type, sentMessage);

    return sentMessage;
  }

  /**
   * Delete a message
   * @param chatId Chat ID in which message you want to delete is located
   * @param msgId Message ID you want to delete
   * @see https://core.telegram.org/bots/api#deletemessage
   * @return true on success
   * */
  delete(chatId: number | string | null, msgId: number | null): Promise<boolean> {
    return this.callApi<boolean, IDeleteMessageFetchOptions>('deleteMessage', {
      chat_id: chatId,
      message_id: msgId,
    });
  }

  /**
   * Stop a poll
   * @param chatId Chat ID in which poll you want to stop is located
   * @param msgId Message ID of the poll you want to stop
   * @param keyboard Keyboard you want to edit
   * @param moreOptions More options {@link IStopPollOptions}
   * @see https://core.telegram.org/bots/api#stoppoll
   * */
  stopPoll(
    chatId: number | string | null,
    msgId: number | null,
    keyboard?: Keyboard,
    moreOptions: IStopPollOptions = {},
  ): Promise<IPoll> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return this.callApi<IPoll, IStopPollFetchOptions>('stopPoll', {
      chat_id: chatId,
      message_id: msgId,
      ...(moreOptions || {}),
    });
  }

  /**
   * Setups chat action
   * @param chatId Chat ID where you want to send action. It can be id of group/channel or ID of the user
   * @param action Action type {@link ChatActions}
   * @see https://core.telegram.org/bots/api#sendchataction
   * */
  chatAction(chatId: number | string, action: ChatActions): Promise<true> {
    return this.callApi<true, ISendChatActionFetchOptions>('sendChatAction', {
      chat_id: chatId,
      action,
    });
  }

  /**
   * @param userId Id of the user you want to get profile photos
   * @param limit Limit of user profile photos
   * @param offset Skip user profile photos
   * @see https://core.telegram.org/bots/api#getuserprofilephotos
   * @return User profile photos
   * */
  getUserProfilePhotos(
    userId: number,
    limit?: number,
    offset?: number,
  ): Promise<IUserProfilePhotos> {
    return this.callApi<IUserProfilePhotos, IGetUserProfilePhotosFetchOptions>(
      'getUserProfilePhotos',
      {
        user_id: userId,
        limit,
        offset,
      },
    );
  }

  /**
   * Ban chat member
   * @param chatId Id of the chat in which the person you want to ban is located
   * @param userId User id you want to ban
   * @param untilDate Ban end date
   * @param revokeMessages Remove all messages by this user
   * @see https://core.telegram.org/bots/api#banchatmember
   * @return true on success
   * */
  ban(
    chatId: number | string,
    userId: number,
    untilDate?: number,
    revokeMessages?: boolean,
  ): Promise<true> {
    return this.callApi<true, IBanChatMemberFetchOptions>('banChatMember', {
      chat_id: chatId,
      user_id: userId,
      until_date: untilDate,
      revoke_messages: revokeMessages,
    });
  }

  /**
   * Unban chat member
   * @param chatId Id of the chat in which the person you want to ban is located
   * @param userId User id you want to ban
   * @param onlyIfBanned Do nothing if the user is not banned
   * @see https://core.telegram.org/bots/api#unbanchatmember
   * @return true on success
   * */
  unban(chatId: number | string, userId: number, onlyIfBanned?: boolean): Promise<true> {
    return this.callApi<true, IUnbanChatMemberFetchOptions>('unbanChatMember', {
      chat_id: chatId,
      user_id: userId,
      only_if_banned: onlyIfBanned,
    });
  }

  /**
   * Set admin custom title
   * @param chatId Id of the chat in which the person you want to set custom title is located
   * @param userId User id you want to set a custom title for
   * @param title Admin custom title (status, post, job title. 0-16 characters, emoji are not allowed)
   * @see https://core.telegram.org/bots/api#setchatadministratorcustomtitle
   * @return true on success
   * */
  adminTitle(chatId: number | string, userId: number, title: string): Promise<true> {
    return this.callApi<true, ISetChatAdministratorCustomTitle>('setChatAdministratorCustomTitle', {
      chat_id: chatId,
      user_id: userId,
      custom_title: title,
    });
  }

  /**
   * Restrict chat member
   * @param chatId Id of the chat in which the person you want to restrict is located
   * @param userId User id you want to restrict
   * @param permissions Permissions you grant to the user {@link IChatPermissions}
   * @param untilDate Date when restrictions will be lifted for the user, unix time. If user is restricted for more than 366 days or less than 30 seconds from the current time, they are considered to be restricted forever
   * @see https://core.telegram.org/bots/api#restrictchatmember
   * @return true on success
   * */
  restrict(
    chatId: number | string,
    userId: number,
    permissions: IChatPermissions,
    untilDate?: number,
  ): Promise<true> {
    return this.callApi<true, IRestrictChatMemberFetchOptions>('restrictChatMember', {
      chat_id: chatId,
      user_id: userId,
      until_date: untilDate,
      permissions,
    });
  }

  /**
   * Promote chat member
   * @param chatId Id of the chat in which the person you want to promote is located
   * @param userId User id you want to promote
   * @param permissions Permissions you grant to the user {@link IPromoteChatPermissions}
   * @see https://core.telegram.org/bots/api#promotechatmember
   * @return true on success
   * */
  promote(
    chatId: number | string,
    userId: number,
    permissions: IPromoteChatPermissions,
  ): Promise<true> {
    return this.callApi<true, IPromoteChatMemberFetchOptions>('promoteChatMember', {
      chat_id: chatId,
      user_id: userId,
      ...permissions,
    });
  }

  /**
   * Set chat permissions
   * @param chatId Id of the chat you want to set permissions
   * @param permissions Chat permissions you want to set {@link IChatPermissions}
   * @see https://core.telegram.org/bots/api#setchatpermissions
   * @return true on success
   * */
  setChatPermissions(chatId: number | string, permissions: IChatPermissions): Promise<true> {
    return this.callApi<true, ISetChatPermissionsFetchOptions>('setChatPermissions', {
      chat_id: chatId,
      permissions,
    });
  }

  /**
   * Export chat invite link
   * @param chatId Id of the chat you want to export invite link
   * @see https://core.telegram.org/bots/api#exportchatinvitelink
   * @return string Invite link on success
   * */
  exportInviteLink(chatId: number | string): Promise<string> {
    return this.callApi<string, IExportChatInviteLinkFetchOptions>('exportChatInviteLink', {
      chat_id: chatId,
    });
  }

  /**
   * Creates chat invite link
   * @param chatId Chat ID where you want to create invite link. It can be id of group/channel or ID of the user
   * @param moreOptions Message options {@link ICreateChatInviteLinkOptions}
   * @see https://core.telegram.org/bots/api#createchatinvitelink
   * @return Chat invite link info {@link IChatInviteLink}
   * */
  createInviteLink(
    chatId: number | string,
    moreOptions: ICreateChatInviteLinkOptions = {},
  ): Promise<IChatInviteLink> {
    return this.callApi<IChatInviteLink, ICreateChatInviteLinkFetchOptions>(
      'createChatInviteLink',
      {
        chat_id: chatId,
        ...moreOptions,
      },
    );
  }

  /**
   * Revokes chat invite link
   * @param chatId Chat ID where you want to revoke invite link. It can be id of group/channel or ID of the user
   * @param inviteLink Invite link you want to revoke
   * @see https://core.telegram.org/bots/api#revokechatinvitelink
   * @return Chat invite link info {@link IChatInviteLink}
   * */
  revokeInviteLink(chatId: number | string, inviteLink: string): Promise<IChatInviteLink> {
    return this.callApi<IChatInviteLink, IRevokeChatInviteLinkFetchOptions>(
      'revokeChatInviteLink',
      {
        chat_id: chatId,
        invite_link: inviteLink,
      },
    );
  }

  /**
   * Set chat photo
   * @param chatId Chat ID where you want to set chat photo. It can be id of group/channel or ID of the user
   * @param photo Photo you want to set (you can create it using Photo class)
   * @see https://core.telegram.org/bots/api#setchatphoto
   * @return true on success
   * */
  setChatPhoto(chatId: number | string, photo: Photo): Promise<boolean> {
    return this.callApi<boolean, FormData>(
      'setChatPhoto',
      this.buildFormData<ISetChatPhotoFetchOptions>('photo', photo, { chat_id: chatId }),
    );
  }

  /**
   * Deletes chat photo
   * @param chatId Chat ID where you want to delete chat photo. It can be id of group/channel or ID of the user
   * @see https://core.telegram.org/bots/api#deletechatphoto
   * @return true on success
   * */
  deleteChatPhoto(chatId: number | string): Promise<boolean> {
    return this.callApi<boolean, IDeleteChatPhotoFetchOptions>('deleteChatPhoto', {
      chat_id: chatId,
    });
  }

  /**
   * Set chat title
   * @param chatId Chat ID where you want to set chat title. It can be id of group/channel or ID of the user
   * @param title Title you want to set for the chat
   * @see https://core.telegram.org/bots/api#setchattitle
   * @return true on success
   * */
  setChatTitle(chatId: number | string, title: string): Promise<boolean> {
    return this.callApi<boolean, ISetChatTitleFetchOptions>('setChatTitle', {
      chat_id: chatId,
      title,
    });
  }

  /**
   * Set chat title
   * @param chatId Chat ID where you want to set chat description. It can be id of group/channel or ID of the user
   * @param description Description you want to set for the chat
   * @see https://core.telegram.org/bots/api#setchatdescription
   * @return true on success
   * */
  setChatDescription(chatId: number | string, description: string): Promise<boolean> {
    return this.callApi<boolean, ISetChatDescriptionFetchOptions>('setChatDescription', {
      chat_id: chatId,
      description,
    });
  }

  /**
   * Pin chat message
   * @param chatId Chat ID where you want to pin message. It can be id of group/channel or ID of the user
   * @param msgId Message ID you want to pin
   * @param disableNotification Optional. Disable notification for all chat users that you have pinned a message
   * @see https://core.telegram.org/bots/api#pinchatmessage
   * @return true on success
   * */
  pin(chatId: number | string, msgId: number, disableNotification?: boolean): Promise<boolean> {
    return this.callApi<boolean, IPinChatMessageFetchOptions>('pinChatMessage', {
      chat_id: chatId,
      message_id: msgId,
      disable_notification: disableNotification,
    });
  }

  /**
   * Unpin chat message
   * @param chatId Chat ID where you want to unpin message. It can be id of group/channel or ID of the user
   * @param msgId Message ID you want to unpin. Or pass 'all' to unpin all messages
   * @see https://core.telegram.org/bots/api#unpinchatmessage
   * @return true on success
   * */
  unpin(chatId: number | string, msgId: number | 'all'): Promise<boolean> {
    if (msgId === 'all') return this.unpinAll(chatId);

    return this.callApi<boolean, IUnpinChatMessageFetchOptions>('unpinChatMessage', {
      chat_id: chatId,
      message_id: msgId,
    });
  }

  /**
   * Unpin all chat messages
   * @param chatId Chat ID where you want to unpin all messages. It can be id of group/channel or ID of the user
   * @see https://core.telegram.org/bots/api#unpinallchatmessages
   * @return true on success
   * */
  unpinAll(chatId: number | string): Promise<boolean> {
    return this.callApi<boolean, IUnpinAllChatMessagesFetchOptions>('unpinAllChatMessages', {
      chat_id: chatId,
    });
  }

  /**
   * Leaves chat
   * @param chatId Chat ID you want to leave
   * @see https://core.telegram.org/bots/api#leavechat
   * @return true on success
   * */
  leave(chatId: number | string): Promise<boolean> {
    return this.callApi<boolean, ILeaveChatFetchOptions>('leaveChat', {
      chat_id: chatId,
    });
  }

  /**
   * Get chat
   * @param chatId Chat ID you want to get
   * @see https://core.telegram.org/bots/api#getchat
   * @return Chat info on success {@link IChat}
   * */
  getChat(chatId: number | string): Promise<IChat> {
    return this.callApi<IChat, IGetChatFetchOptions>('getChat', {
      chat_id: chatId,
    });
  }

  /**
   * Get chat administrators
   * @param chatId Chat ID in which you want to get administrators
   * @see https://core.telegram.org/bots/api#getchatadministrators
   * @return Array of {@link ChatMember}
   * */
  getChatAdmins(chatId: number | string): Promise<ChatMember[]> {
    return this.callApi<ChatMember[], IGetChatAdministratorsFetchOptions>('getChatAdministrators', {
      chat_id: chatId,
    });
  }

  /**
   * Get chat member count
   * @param chatId Chat ID in which you want to get member count
   * @see https://core.telegram.org/bots/api#getchatmembercount
   * @return {?number}
   * */
  getChatMemberCount(chatId: number | string): Promise<number> {
    return this.callApi<number, IGetChatMemberCountFetchOptions>('getChatMemberCount', {
      chat_id: chatId,
    });
  }

  /**
   * Get chat member
   * @param chatId Chat ID in which you want to get member info
   * @param userId User ID you want to get chat member info
   * @see https://core.telegram.org/bots/api#getchatmember
   * @return {@link ChatMember}
   * */
  getChatMember(chatId: number | string, userId: number): Promise<ChatMember> {
    return this.callApi<ChatMember, IGetChatMemberFetchOptions>('getChatMember', {
      chat_id: chatId,
      user_id: userId,
    });
  }

  /**
   * Set chat sticker set
   * @param chatId Chat ID you want to set sticker set
   * @param stickerSetName Sticker set name you want to set
   * @see https://core.telegram.org/bots/api#setchatstickerset
   * @return {true} on success
   * */
  setChatStickerSet(chatId: number | string, stickerSetName: string): Promise<boolean> {
    return this.callApi<boolean, ISetChatStickerSetFetchOptions>('setChatStickerSet', {
      chat_id: chatId,
      sticker_set_name: stickerSetName,
    });
  }

  /**
   * Delete chat sticker set
   * @param chatId Chat ID you want to delete sticker set
   * @see https://core.telegram.org/bots/api#deletechatstickerset
   * @return {true} on success
   * */
  deleteChatStickerSet(chatId: number | string): Promise<boolean> {
    return this.callApi<boolean, IDeleteChatStickerSetFetchOptions>('deleteChatStickerSet', {
      chat_id: chatId,
    });
  }

  /**
   * Set my commands
   * @param commands Commands you want to set (Array of {@link IBotCommand})
   * @param scope Optional. Scope for which you want to set commands. {@link BotCommandScope}
   * @param languageCode Optional. A two-letter ISO 639-1 language code. If empty, commands will be applied to all users from the given scope, for whose language there are no dedicated commands
   * @see https://core.telegram.org/bots/api#setmycommands
   * @see https://core.telegram.org/bots#commands
   * @return {true} on success
   * */
  setMyCommands(
    commands: IBotCommand[],
    scope?: BotCommandScope,
    languageCode?: string,
  ): Promise<boolean> {
    return this.callApi<boolean, ISetMyCommandsFetchOptions>('setMyCommands', {
      commands,
      scope,
      language_code: languageCode,
    });
  }

  /**
   * Delete my commands
   * @param scope Optional. Scope for which you want to delete commands. {@link BotCommandScope}
   * @param languageCode Optional. A two-letter ISO 639-1 language code. If empty, commands will be applied to all users from the given scope, for whose language there are no dedicated commands
   * @see https://core.telegram.org/bots/api#deletemycommands
   * @return {true} on success
   * */
  deleteMyCommands(scope?: BotCommandScope, languageCode?: string): Promise<boolean> {
    return this.callApi<boolean, IDeleteMyCommandsFetchOptions>('deleteMyCommands', {
      scope,
      language_code: languageCode,
    });
  }

  /**
   * Get my commands
   * @param scope Optional. Scope for which you want to get commands. {@link BotCommandScope}
   * @param languageCode Optional. A two-letter ISO 639-1 language code. If empty, commands will be applied to all users from the given scope, for whose language there are no dedicated commands
   * @see https://core.telegram.org/bots/api#getmycommands
   * @return Array of {@link IBotCommand} on success
   * */
  getMyCommands(scope?: BotCommandScope, languageCode?: string): Promise<IBotCommand[]> {
    return this.callApi<IBotCommand[], IGetMyCommandsFetchOptions>('getMyCommands', {
      scope,
      language_code: languageCode,
    });
  }

  /**
   * Set chat menu button
   * @param menuButton Optional. Menu button you want to set ({@link BotMenuButton})
   * @param chatId Optional. Chat ID in which you want to set menu button. It can be id of group/channel or ID of the user
   * @see https://core.telegram.org/bots/api#setchatmenubutton
   * @return {true} on success
   * */
  setMenuButton(menuButton?: BotMenuButton, chatId?: number | string): Promise<boolean> {
    return this.callApi<boolean, ISetChatMenuButtonFetchOptions>('setChatMenuButton', {
      chat_id: chatId,
      menu_button: menuButton,
    });
  }

  /**
   * Get chat menu button
   * @param chatId Optional. Chat ID in which you want to get menu button. It can be id of group/channel or ID of the user
   * @see https://core.telegram.org/bots/api#getchatmenubutton
   * @return {@link BotMenuButton} on success
   * */
  getMenuButton(chatId?: number | string): Promise<BotMenuButton> {
    return this.callApi<BotMenuButton, IGetChatMenuButtonFetchOptions>('getChatMenuButton', {
      chat_id: chatId,
    });
  }

  /**
   * Set my default administrator rights
   * @param rights Optional. Rights you want to set as default
   * @param forChannels Optional. Pass true to get default administrator rights of the bot in channels. Otherwise, default administrator rights of the bot for groups and supergroups will be returned
   * @see https://core.telegram.org/bots/api#setmydefaultadministratorrights
   * @return {true} on success
   * */
  setMyDefaultAdminRights(
    rights?: IChatAdministratorRights,
    forChannels?: boolean,
  ): Promise<boolean> {
    return this.callApi<boolean, ISetMyDefaultAdministratorRightsFetchOptions>(
      'setMyDefaultAdministratorRights',
      {
        rights,
        for_channels: forChannels,
      },
    );
  }

  /**
   * Get my default administrator rights
   * @param forChannels Optional. Pass true to get default administrator rights of the bot in channels. Otherwise, default administrator rights of the bot for groups and supergroups will be returned
   * @see https://core.telegram.org/bots/api#getmydefaultadministratorrights
   * @return {@link IChatAdministratorRights} on success
   * */
  getMyDefaultAdminRights(forChannels?: boolean): Promise<IChatAdministratorRights> {
    return this.callApi<IChatAdministratorRights, IGetMyDefaultAdministratorRightsFetchOptions>(
      'getMyDefaultAdministratorRights',
      { for_channels: forChannels },
    );
  }

  /**
   * Approves chat join request
   * @param chatId Chat ID where you want to approve join request. It can be id of group/channel or ID of the user
   * @param userId User ID you want to approve join request
   * @see https://core.telegram.org/bots/api#approvechatjoinrequest
   * @return true on success
   * */
  approveJoinRequest(chatId: number | string, userId: number): Promise<boolean> {
    return this.callApi<boolean, IApproveChatJoinRequestFetchOptions>('approveChatJoinRequest', {
      chat_id: chatId,
      user_id: userId,
    });
  }

  /**
   * Declines chat join request
   * @param chatId Chat ID where you want to decline join request. It can be id of group/channel or ID of the user
   * @param userId User ID you want to decline join request
   * @see https://core.telegram.org/bots/api#declinechatjoinrequest
   * @return true on success
   * */
  declineJoinRequest(chatId: number | string, userId: number): Promise<boolean> {
    return this.callApi<boolean, IDeclineChatJoinRequestFetchOptions>('declineChatJoinRequest', {
      chat_id: chatId,
      user_id: userId,
    });
  }

  /**
   * Ban chat sender chat
   * @param chatId Id of the chat in which the chat you want to ban is located
   * @param senderChatId Chat id you want to ban
   * @see https://core.telegram.org/bots/api#banchatsenderchat
   * @return true on success
   * */
  banChat(chatId: number | string, senderChatId: number): Promise<true> {
    return this.callApi<true, IBanChatSenderChatFetchOptions>('banChatSenderChat', {
      chat_id: chatId,
      sender_chat_id: senderChatId,
    });
  }

  /**
   * Unban chat sender chat
   * @param chatId Id of the chat in which the chat you want to unban is located
   * @param senderChatId Chat id you want to ban
   * @see https://core.telegram.org/bots/api#unbanchatsenderchat
   * @return true on success
   * */
  unbanChat(chatId: number | string, senderChatId: number): Promise<true> {
    return this.callApi<true, IBanChatSenderChatFetchOptions>('unbanChatSenderChat', {
      chat_id: chatId,
      sender_chat_id: senderChatId,
    });
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

  /**
   * Stops message live location
   * @param chatId Chat id
   * @param msgId Id of the live location message you want to stop
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link IStopMessageLiveLocationOptions}
   * @see https://core.telegram.org/bots/api#editmessagelivelocation
   * */
  stopLiveLocation(
    chatId: number | string | null,
    msgId: number | null,
    keyboard: Keyboard | null = null,
    moreOptions: IStopMessageLiveLocationOptions = {},
  ): Promise<IMessage | true> {
    if (keyboard) moreOptions.reply_markup = keyboard.buildMarkup();

    return this.callApi<IMessage | true, IStopMessageLiveLocationFetchOptions>(
      'stopMessageLiveLocation',
      {
        chat_id: chatId,
        message_id: msgId,
        ...moreOptions,
      },
    );
  }
}
