import { RawUpdate } from '../../events/raw-update.types';

/**
 * Every update kind the engine routes on. Each value is the raw Bot API
 * update-field name, so resolution can index the update by it. The single source
 * of truth for kind comparisons across the engine — compare against
 * `UpdateKind.X`, never a bare string.
 *
 * A genuinely new field Telegram adds later won't be here; `resolveKind` returns
 * `null` for it and the context factory logs a one-off warning rather than
 * silently dropping it (see {@link unmodelledKind}).
 */
export enum UpdateKind {
  Message = 'message',
  EditedMessage = 'edited_message',
  ChannelPost = 'channel_post',
  EditedChannelPost = 'edited_channel_post',
  BusinessConnection = 'business_connection',
  BusinessMessage = 'business_message',
  EditedBusinessMessage = 'edited_business_message',
  DeletedBusinessMessages = 'deleted_business_messages',
  MessageReaction = 'message_reaction',
  MessageReactionCount = 'message_reaction_count',
  InlineQuery = 'inline_query',
  ChosenInlineResult = 'chosen_inline_result',
  CallbackQuery = 'callback_query',
  ShippingQuery = 'shipping_query',
  PreCheckoutQuery = 'pre_checkout_query',
  PurchasedPaidMedia = 'purchased_paid_media',
  Poll = 'poll',
  PollAnswer = 'poll_answer',
  MyChatMember = 'my_chat_member',
  ChatMember = 'chat_member',
  ChatJoinRequest = 'chat_join_request',
  ChatBoost = 'chat_boost',
  RemovedChatBoost = 'removed_chat_boost',
}

/**
 * Checked in priority order if an update somehow carries more than one field.
 * In practice an Update has exactly one update-type field besides `update_id`.
 */
const KIND_ORDER: readonly UpdateKind[] = [
  UpdateKind.Message,
  UpdateKind.EditedMessage,
  UpdateKind.ChannelPost,
  UpdateKind.EditedChannelPost,
  UpdateKind.BusinessConnection,
  UpdateKind.BusinessMessage,
  UpdateKind.EditedBusinessMessage,
  UpdateKind.DeletedBusinessMessages,
  UpdateKind.MessageReaction,
  UpdateKind.MessageReactionCount,
  UpdateKind.InlineQuery,
  UpdateKind.ChosenInlineResult,
  UpdateKind.CallbackQuery,
  UpdateKind.ShippingQuery,
  UpdateKind.PreCheckoutQuery,
  UpdateKind.PurchasedPaidMedia,
  UpdateKind.Poll,
  UpdateKind.PollAnswer,
  UpdateKind.MyChatMember,
  UpdateKind.ChatMember,
  UpdateKind.ChatJoinRequest,
  UpdateKind.ChatBoost,
  UpdateKind.RemovedChatBoost,
];

const KNOWN_KINDS: ReadonlySet<string> = new Set<string>(
  Object.values(UpdateKind),
);

/**
 * Resolve the kind of a raw update by checking known fields in priority order.
 *
 * Pure and allocation-free; returns `null` for an update with no recognised
 * field (the caller should then skip it — no handler can match).
 */
export function resolveKind(update: RawUpdate): UpdateKind | null {
  for (const kind of KIND_ORDER) {
    if (update[kind] !== undefined) {
      return kind;
    }
  }

  return null;
}

/**
 * The name of a present update field this engine version does NOT model (a
 * Bot API addition newer than `UpdateKind`), or `null`. Lets the caller surface
 * a future update type with a warning instead of dropping it silently.
 */
export function unmodelledKind(update: RawUpdate): string | null {
  for (const [key, value] of Object.entries(update)) {
    if (key !== 'update_id' && value !== undefined && !KNOWN_KINDS.has(key)) {
      return key;
    }
  }

  return null;
}
