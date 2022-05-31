import { IMessage } from './update.types';

export interface IUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface IChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo?: any; //!
  bio?: string;
  has_private_forwards?: true;
  description?: string;
  invite_link?: string;
  pinned_message?: IMessage;
  permissions?: any; //!
  slow_mode_delay?: number;
  message_auto_delete_time?: number;
  has_protected_content?: true;
  sticker_set_name?: string;
  can_set_sticker_set?: true;
  linked_chat_id?: number;
  location?: any; //!
}
