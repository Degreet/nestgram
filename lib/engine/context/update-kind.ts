import { RawUpdate } from '../../types/raw-update.types';

/**
 * The set of update kinds the Phase 1 engine resolves and routes on.
 *
 * Deliberately a closed whitelist: unknown / future top-level update fields are
 * ignored rather than guessed at (unlike the legacy `extractUpdateType`, which
 * took the first non-`update_id` key). The checked order also fixes routing
 * priority when an update somehow carries more than one known field.
 *
 * Single source of truth — the `UpdateKind` type is derived from this list.
 */
const KNOWN_KINDS = [
  'message',
  'edited_message',
  'channel_post',
  'edited_channel_post',
  'business_message',
  'edited_business_message',
  'callback_query',
] as const;

export type UpdateKind = (typeof KNOWN_KINDS)[number];

/**
 * Resolve the kind of a raw update by checking known fields in priority order.
 *
 * Pure and allocation-free; returns `null` for an update with no recognised
 * field (the caller should then skip it — no handler can match).
 */
export function resolveKind(update: RawUpdate): UpdateKind | null {
  for (const kind of KNOWN_KINDS) {
    if (update[kind] !== undefined) {
      return kind;
    }
  }

  return null;
}
