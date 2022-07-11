import { MediaFileTypes } from './media.types';
import { ContentTypes } from './handler.types';
import { MessageCreator } from '../classes';

export type SendTypes =
  | 'send'
  | 'alert'
  | 'toast'
  | 'forward'
  | 'copy'
  | 'chatAction'
  | 'ban'
  | 'unban'
  | 'restrict'
  | 'promote'
  | 'adminTitle'
  | 'saveFile'
  | 'saveProfilePhoto'
  | 'setChatPermissions'
  | 'approveJoinRequest'
  | 'declineJoinRequest'
  | 'setChatPhoto'
  | 'deleteChatPhoto'
  | 'setChatTitle'
  | 'setChatDescription'
  | 'pin'
  | 'unpin'
  | 'leave'
  | 'setChatStickerSet'
  | 'deleteChatStickerSet'
  | 'setMyCommands'
  | 'deleteMyCommands'
  | 'setMenuButton'
  | 'setMyDefaultAdminRights'
  | 'edit'
  | 'delete'
  | 'stopPoll';

type NextLineFunction = () => Promise<any> | any;
export type NextLineAction = MessageCreator | ContentTypes | NextLineFunction;
export type MessageCreatorTypes = MediaFileTypes | 'text' | 'location';
