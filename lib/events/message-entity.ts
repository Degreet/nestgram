import { RawMessage, RawMessageEntity } from './raw-update.types';

/**
 * A message entity with its `text` resolved — the rich counterpart to
 * {@link RawMessageEntity}, whose `offset`/`length` only index into the message
 * text or caption. Every raw field is preserved; `text` is the substring the
 * entity spans (e.g. the `@username` of a `mention`, the URL of a `url`).
 */
export type MessageEntity = RawMessageEntity & { text: string };

/**
 * A {@link Message.hasEntity} query: a bare entity `type` (any entity of that
 * kind matches), or a `type` paired with the exact `text` the entity must span
 * (e.g. `{ type: 'mention', text: '@my_bot' }`).
 */
export type EntityQuery = string | { type: string; text: string };

/** The text (or caption) fields an entity can be sliced out of. */
type EntityCarrier = Pick<
  RawMessage,
  'text' | 'entities' | 'caption' | 'caption_entities'
>;

/**
 * The entities carried by `message` — from its text and its media caption both —
 * each paired with the `text` it spans. Pass a `type` to keep only that kind.
 *
 * Entity `offset`/`length` are UTF-16 code units, which is exactly how JS indexes
 * strings — so a plain `slice` is correct, no surrogate juggling needed.
 */
export function messageEntities(
  message: EntityCarrier,
  type?: string,
): MessageEntity[] {
  const sources: [string | undefined, RawMessageEntity[] | undefined][] = [
    [message.text, message.entities],
    [message.caption, message.caption_entities],
  ];

  return sources.flatMap(([source, entities]) => {
    if (!source || !entities) {
      return [];
    }
    return entities
      .filter((entity) => type === undefined || entity.type === type)
      .map((entity) => ({
        ...entity,
        text: source.slice(entity.offset, entity.offset + entity.length),
      }));
  });
}
