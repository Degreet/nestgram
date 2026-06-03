/**
 * Telegram `MessageEntity` types. Centralizes the wire strings so the entity
 * listeners (`@OnEmail`) and param decorators (`@Email`) share one source.
 */
export const EntityType = {
  Mention: 'mention',
  Hashtag: 'hashtag',
  Cashtag: 'cashtag',
  BotCommand: 'bot_command',
  Url: 'url',
  Email: 'email',
  PhoneNumber: 'phone_number',
  TextLink: 'text_link',
  TextMention: 'text_mention',
  CustomEmoji: 'custom_emoji',
} as const;

export type EntityType = (typeof EntityType)[keyof typeof EntityType];
