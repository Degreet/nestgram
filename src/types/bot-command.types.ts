export type BotCommandScopeTypes =
  | 'default'
  | 'all_private_chats'
  | 'all_group_chats'
  | 'all_chat_administrators'
  | 'chat'
  | 'chat_administrators'
  | 'chat_member';

export type BotCommandScope =
  | IBotCommandScopeDefault
  | IBotCommandScopeAllPrivateChats
  | IBotCommandScopeAllGroupChats
  | IBotCommandScopeAllChatAdministrators
  | IBotCommandScopeChat
  | IBotCommandScopeChatAdministrators
  | IBotCommandScopeChatMember;

export interface IBotCommandScopeDefaultOptions {
  type: BotCommandScopeTypes;
}

export interface IBotCommandScopeDefault extends IBotCommandScopeDefaultOptions {
  type: 'default';
}

export interface IBotCommandScopeAllPrivateChats extends IBotCommandScopeDefaultOptions {
  type: 'all_private_chats';
}

export interface IBotCommandScopeAllGroupChats extends IBotCommandScopeDefaultOptions {
  type: 'all_group_chats';
}

export interface IBotCommandScopeAllChatAdministrators extends IBotCommandScopeDefaultOptions {
  type: 'all_chat_administrators';
}

export interface IBotCommandScopeChat extends IBotCommandScopeDefaultOptions {
  type: 'chat';
}

export interface IBotCommandScopeChatAdministrators extends IBotCommandScopeDefaultOptions {
  type: 'chat_administrators';
  chat_id: string | number;
}

export interface IBotCommandScopeChatMember extends IBotCommandScopeDefaultOptions {
  type: 'chat_member';
  chat_id: string | number;
  user_id: number;
}

export interface IBotCommand {
  command: string;
  description: string;
}
