import { RawUpdate } from '../../events/raw-update.types';

/**
 * The update kinds the Phase 1 engine resolves and routes on. Each value is the
 * raw Bot API update-field name, so resolution can index the update by it.
 *
 * A closed whitelist: unknown / future top-level fields are ignored rather than
 * guessed at. The single source of truth for kind comparisons across the engine
 * — compare against `UpdateKind.X`, never a bare string.
 */
export enum UpdateKind {
  Message = 'message',
  EditedMessage = 'edited_message',
  ChannelPost = 'channel_post',
  EditedChannelPost = 'edited_channel_post',
  BusinessMessage = 'business_message',
  EditedBusinessMessage = 'edited_business_message',
  CallbackQuery = 'callback_query',
}

/** Checked in priority order if an update somehow carries more than one field. */
const KIND_ORDER: readonly UpdateKind[] = [
  UpdateKind.Message,
  UpdateKind.EditedMessage,
  UpdateKind.ChannelPost,
  UpdateKind.EditedChannelPost,
  UpdateKind.BusinessMessage,
  UpdateKind.EditedBusinessMessage,
  UpdateKind.CallbackQuery,
];

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
