import {
  Keyboard,
  ChatActions,
  ContentTypes,
  IAnswerCallbackQueryOptions,
  IForwardMessageOptions,
  ICopyMessageOptions,
  IStopMessageLiveLocationOptions,
  ISendOptions,
  IMessage,
  IUpdate,
  IFile,
  IUserProfilePhotos,
  IPhotoSize,
  IMessageId,
  IChatPermissions,
  IPromoteChatPermissions,
  ICreateChatInviteLinkOptions,
  IChatInviteLink,
  Photo,
  IChat,
  ChatMember,
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
   * Setups chat action
   * @param action Action type {@link ChatActions}
   * @see https://core.telegram.org/bots/api#sendchataction
   * */
  chatAction(action: ChatActions): Promise<true> {
    const chatId: number | string | undefined = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.chatAction(chatId, action);
  }

  /**
   * @param limit Limit of user profile photos
   * @param offset Skip user profile photos
   * @see https://core.telegram.org/bots/api#getuserprofilephotos
   * @return User profile photos
   * */
  getUserProfilePhotos(limit?: number, offset?: number): Promise<IUserProfilePhotos> {
    const userId: number | undefined = Filter.getUserId(this.update);
    if (!userId) throw error(`Can't find userId from update`);
    return this.api.getUserProfilePhotos(userId, limit, offset);
  }

  /**
   * Stops message live location
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions More options {@link IStopMessageLiveLocationOptions}
   * @see https://core.telegram.org/bots/api#editmessagelivelocation
   * */
  stopLiveLocation(
    keyboard: Keyboard | null = null,
    moreOptions: IStopMessageLiveLocationOptions = {},
  ): Promise<IMessage | true> {
    const chatId: number | string | undefined = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);

    const msgId: number | string | undefined = Filter.getMsgId(this.update);
    if (!msgId) throw error(`Can't find msgId from update`);

    return this.api.stopLiveLocation(chatId, msgId, keyboard, moreOptions);
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
  forward(toChatId: number | string, moreOptions?: IForwardMessageOptions): Promise<IMessage> {
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
  copy(
    toChatId: number | string,
    keyboard?: Keyboard | null,
    moreOptions?: ICopyMessageOptions,
  ): Promise<IMessageId> {
    const chatId: number | string | undefined = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);

    const msgId: number | undefined = Filter.getMsgId(this.update);
    if (!msgId) throw error(`Can't find msgId from update`);

    return this.api.copy(msgId, chatId, toChatId, keyboard, moreOptions);
  }

  /**
   * Ban chat member
   * @param untilDate Ban end date
   * @param revokeMessages Remove all messages by this user
   * @param userId User id you want to ban
   * @see https://core.telegram.org/bots/api#banchatmember
   * @return true on success
   * */
  ban(untilDate?: number, revokeMessages?: boolean, userId?: number): Promise<true> {
    const chatId: number | string | undefined = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);

    const message: IMessage = Filter.getMessage(this.update);
    if (message?.sender_chat) return this.banChat();

    if (!userId) userId = Filter.getUserId(this.update);
    if (!userId) throw error(`Can't find userId from update`);

    return this.api.ban(chatId, userId, untilDate, revokeMessages);
  }

  /**
   * Unban chat member
   * @param onlyIfBanned Do nothing if the user is not banned
   * @param userId User id you want to ban
   * @see https://core.telegram.org/bots/api#unbanchatmember
   * @return true on success
   * */
  unban(onlyIfBanned?: boolean, userId?: number): Promise<true> {
    const chatId: number | string | undefined = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);

    const message: IMessage = Filter.getMessage(this.update);
    if (message?.sender_chat) return this.unbanChat();

    if (!userId) userId = Filter.getUserId(this.update);
    if (!userId) throw error(`Can't find userId from update`);

    return this.api.unban(chatId, userId, onlyIfBanned);
  }

  /**
   * Restrict chat member
   * @param permissions Permissions you grant to the user
   * @param userId User id you want to promote
   * @param untilDate Ban end date
   * @see https://core.telegram.org/bots/api#restrictchatmember
   * @return true on success
   * */
  restrict(permissions: IChatPermissions, userId?: number, untilDate?: number): Promise<true> {
    const chatId: number | string | undefined = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);

    if (!userId) userId = Filter.getUserId(this.update);
    if (!userId) throw error(`Can't find userId from update`);

    return this.api.restrict(chatId, userId, permissions, untilDate);
  }

  /**
   * Promote chat member
   * @param permissions Permissions you grant to the user
   * @param userId User id you want to promote
   * @see https://core.telegram.org/bots/api#promotechatmember
   * @return true on success
   * */
  promote(permissions: IPromoteChatPermissions, userId?: number): Promise<true> {
    const chatId: number | string | undefined = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);

    if (!userId) userId = Filter.getUserId(this.update);
    if (!userId) throw error(`Can't find userId from update`);

    return this.api.promote(chatId, userId, permissions);
  }

  /**
   * Export chat invite link
   * @param chatId Optional. ID of the chat you want to export invite link. Current chat id by default
   * @see https://core.telegram.org/bots/api#exportchatinvitelink
   * @return string Invite link on success
   * */
  exportInviteLink(chatId?: number | string): Promise<string> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.exportInviteLink(chatId);
  }

  /**
   * Creates chat invite link
   * @param moreOptions Message options {@link ICreateChatInviteLinkOptions}
   * @param chatId Optional. Chat ID where you want to send dice. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#createchatinvitelink
   * @return Chat invite link info {@link IChatInviteLink}
   * */
  createInviteLink(
    moreOptions: ICreateChatInviteLinkOptions = {},
    chatId?: number | string,
  ): Promise<IChatInviteLink> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.createInviteLink(chatId, moreOptions);
  }

  /**
   * Revokes chat invite link
   * @param inviteLink Invite link you want to revoke
   * @param chatId Optional. Chat ID where you want to revoke invite link. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#revokechatinvitelink
   * @return Chat invite link info {@link IChatInviteLink}
   * */
  revokeInviteLink(inviteLink: string, chatId?: number | string): Promise<IChatInviteLink> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.revokeInviteLink(chatId, inviteLink);
  }

  /**
   * Set chat photo
   * @param photo Photo you want to set (you can create it using Photo class)
   * @param chatId Optional. Chat ID where you want to set chat photo. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#setchatphoto
   * @return true on success
   * */
  setChatPhoto(photo: Photo, chatId?: number | string): Promise<boolean> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.setChatPhoto(chatId, photo);
  }

  /**
   * Deletes chat photo
   * @param chatId Optional. Chat ID where you want to delete chat photo. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#deletechatphoto
   * @return true on success
   * */
  deleteChatPhoto(chatId?: number | string): Promise<boolean> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.deleteChatPhoto(chatId);
  }

  /**
   * Set chat title
   * @param title Title you want to set for the chat
   * @param chatId Optional. Chat ID where you want to set chat title. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#setchattitle
   * @return true on success
   * */
  setChatTitle(title: string, chatId?: number | string): Promise<boolean> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.setChatTitle(chatId, title);
  }

  /**
   * Set chat description
   * @param description Description you want to set for the chat
   * @param chatId Optional. Chat ID where you want to set chat description. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#setchatdescription
   * @return true on success
   * */
  setChatDescription(description: string, chatId?: number | string): Promise<boolean> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.setChatDescription(chatId, description);
  }

  /**
   * Pin chat message
   * @param disableNotification Optional. Disable notification for all chat users that you have pinned a message
   * @param msgId Optional. Message ID you want to pin. Current message id by default
   * @param chatId Optional. Chat ID where you want to pin message. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#pinchatmessage
   * @return true on success
   * */
  pin(disableNotification?: boolean, msgId?: number, chatId?: number | string): Promise<boolean> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);

    if (!msgId) msgId = Filter.getMsgId(this.update);
    if (!msgId) throw error(`Can't find msgId from update`);

    return this.api.pin(chatId, msgId, disableNotification);
  }

  /**
   * Unpin chat message
   * @param msgId Message ID you want to unpin. Or pass 'all' to unpin all messages
   * @param chatId Optional. Chat ID where you want to unpin message. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#unpinchatmessage
   * @return true on success
   * */
  unpin(msgId: number | 'all' = 'all', chatId?: number | string): Promise<boolean> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.unpin(chatId, msgId);
  }

  /**
   * Leaves chat
   * @param chatId Optional. Chat ID you want to leave. Current chat id by default
   * @see https://core.telegram.org/bots/api#leavechat
   * @return true on success
   * */
  leave(chatId?: number | string): Promise<boolean> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.leave(chatId);
  }

  /**
   * Get chat
   * @param chatId Optional. Chat ID you want to get. Current chat id by default
   * @see https://core.telegram.org/bots/api#getchat
   * @return Chat info on success {@link IChat}
   * */
  getChat(chatId?: number | string): Promise<IChat> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.getChat(chatId);
  }

  /**
   * Get chat administrators
   * @param chatId Optional. Chat ID in which you want to get administrators. Current id by default
   * @see https://core.telegram.org/bots/api#getchatadministrators
   * @return Array of {@link ChatMember}
   * */
  getChatAdmins(chatId?: number | string): Promise<ChatMember[]> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.getChatAdmins(chatId);
  }

  /**
   * Get chat member count
   * @param chatId Optional. Chat ID in which you want to get member count. Current id by default
   * @see https://core.telegram.org/bots/api#getchatmembercount
   * @return {?number}
   * */
  getChatMemberCount(chatId?: number | string): Promise<number> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.getChatMemberCount(chatId);
  }

  /**
   * Approves chat join request
   * @param userId User ID you want to approve join request
   * @param chatId Optional. Chat ID where you want to approve join request. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#approvechatjoinrequest
   * @return true on success
   * */
  approveJoinRequest(userId: number, chatId?: number | string): Promise<boolean> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.approveJoinRequest(chatId, userId);
  }

  /**
   * Declines chat join request
   * @param userId User ID you want to decline join request
   * @param chatId Optional. Chat ID where you want to decline join request. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#declinechatjoinrequest
   * @return true on success
   * */
  declineJoinRequest(userId: number, chatId?: number | string): Promise<boolean> {
    if (!chatId) chatId = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.declineJoinRequest(chatId, userId);
  }

  /**
   * Set chat permissions
   * @param permissions Chat permissions you want to set {@link IChatPermissions}
   * @see https://core.telegram.org/bots/api#setchatpermissions
   * @return true on success
   * */
  setChatPermissions(permissions: IChatPermissions): Promise<true> {
    const chatId: number | string | undefined = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);
    return this.api.setChatPermissions(chatId, permissions);
  }

  /**
   * Set admin custom title
   * @param title Admin custom title (status, post, job title. 0-16 characters, emoji are not allowed)
   * @param userId User id you want to set a custom title for
   * @see https://core.telegram.org/bots/api#setchatadministratorcustomtitle
   * @return true on success
   * */
  adminTitle(title: string, userId?: number): Promise<true> {
    const chatId: number | string | undefined = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);

    if (!userId) userId = Filter.getUserId(this.update);
    if (!userId) throw error(`Can't find userId from update`);

    return this.api.adminTitle(chatId, userId, title);
  }

  /**
   * Ban chat sender chat
   * @param senderChatId Optional. Chat id you want to ban
   * @see https://core.telegram.org/bots/api#banchatsenderchat
   * @return true on success
   * */
  banChat(senderChatId?: number): Promise<true> {
    const chatId: number | string | undefined = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);

    if (!senderChatId) senderChatId = Filter.getMessage(this.update)?.sender_chat?.id;
    if (!senderChatId) throw error(`Can't find senderChatId from update`);

    return this.api.banChat(chatId, senderChatId);
  }

  /**
   * Unban chat sender chat
   * @param senderChatId Optional. Chat id you want to ban
   * @see https://core.telegram.org/bots/api#unbanchatsenderchat
   * @return true on success
   * */
  unbanChat(senderChatId?: number): Promise<true> {
    const chatId: number | string | undefined = Filter.getChatId(this.update);
    if (!chatId) throw error(`Can't find chatId from update`);

    if (!senderChatId) senderChatId = Filter.getMessage(this.update)?.sender_chat?.id;
    if (!senderChatId) throw error(`Can't find senderChatId from update`);

    return this.api.unbanChat(chatId, senderChatId);
  }

  /**
   * Saves user profile photo
   * @param path Path where you want to save the image
   * @param index Index of the user profile photo you want to save (0 by default)
   * @return true if saved success
   * */
  async saveProfilePhoto(path: string, index: number = 0): Promise<boolean> {
    const userProfilePhotosInfo: IUserProfilePhotos = await this.getUserProfilePhotos();
    if (!userProfilePhotosInfo) return false;

    const photos: IPhotoSize[] | undefined = userProfilePhotosInfo.photos[index];
    if (!photos) return false;

    const fileId: string | undefined = photos[photos.length - 1]?.file_id;
    if (!fileId) return false;

    return this.saveFile(path, fileId);
  }

  /**
   * Saves any media was sent
   * @param path Path where you want to save the media file
   * @param fileId Id of the file you want to download
   * @return true if saved success
   * */
  async saveFile(path: string, fileId?: string): Promise<boolean> {
    const msg: IMessage = this.update.message;
    if (!msg) return false;

    if (!fileId)
      fileId =
        msg.audio?.file_id ||
        msg.video?.file_id ||
        msg.animation?.file_id ||
        msg.document?.file_id ||
        msg.voice?.file_id ||
        (msg.photo && msg.photo[msg.photo.length - 1]?.file_id);

    if (!fileId) return false;
    const fileInfo: IFile = await this.getFile(fileId);

    try {
      const response: AxiosResponse = await axios({
        method: 'GET',
        url: `https://api.telegram.org/file/bot${this.token}/${fileInfo.file_path}`,
        responseType: 'stream',
      });

      const pf: any = response.data.pipe(fs.createWriteStream(path));

      return await new Promise((resolve: Function): void => {
        pf.on('finish', () => resolve(true));
      });
    } catch (e: any) {
      return false;
    }
  }
}
