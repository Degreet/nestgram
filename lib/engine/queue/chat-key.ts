import { RawChat, RawUpdate } from '../../events/raw-update.types';

/**
 * The default {@link UpdateQueue} serialization key: the chat an update belongs
 * to, so a chat's updates never overlap (two quick messages can't race on that
 * chat's session/FSM state). Coarser than the per-conversation session key on
 * purpose — serializing the whole chat also protects per-chat shared state, and
 * different users in a 1:1 chat collapse to the same chat anyway.
 *
 * Returns `undefined` for chat-less updates (`poll`, `poll_answer`, inline
 * queries, payment queries, business-connection events) — they touch no chat
 * state, so they skip serialization and run concurrency-bounded only. Inline
 * callback queries (no `message`) are likewise chat-less. (A `poll_answer`'s
 * optional `voter_chat` is deliberately not used: a vote mutates no per-chat
 * session/FSM state, so there's nothing to serialize on.)
 *
 * Operates on the raw wire update (the queue runs before the rich event is
 * built), so it reads `chat.id` straight off whichever field carries it.
 */
export function defaultChatKey(update: RawUpdate): string | undefined {
  const chat = chatOf(update);
  return chat ? `c${chat.id}` : undefined;
}

/** The chat an update carries, across every chat-bearing update field. */
function chatOf(update: RawUpdate): RawChat | undefined {
  const message =
    update.message ??
    update.edited_message ??
    update.channel_post ??
    update.edited_channel_post ??
    update.business_message ??
    update.edited_business_message ??
    update.guest_message;
  if (message) {
    return message.chat;
  }

  // A callback query is scoped to the chat of the message its button sits on;
  // an inline callback (inline_message_id, no message) has no chat to scope to.
  const callbackMessage = update.callback_query?.message;
  if (callbackMessage) {
    return callbackMessage.chat;
  }

  return (
    update.message_reaction?.chat ??
    update.message_reaction_count?.chat ??
    update.my_chat_member?.chat ??
    update.chat_member?.chat ??
    update.chat_join_request?.chat ??
    update.chat_boost?.chat ??
    update.removed_chat_boost?.chat ??
    update.deleted_business_messages?.chat
  );
}
