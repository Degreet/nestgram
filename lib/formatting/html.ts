import { RawMessageEntity } from '../events/raw-update.types';

/**
 * Render `text` + Telegram `MessageEntity[]` as an HTML string (the inverse of
 * sending with `parse_mode: 'HTML'`). Useful for re-sending, logging, or
 * transforming formatted text programmatically.
 *
 * Only formatting entities produce tags; auto-detected ones (mention, url,
 * email, …) are left as plain text. Offsets are UTF-16 code units, matching
 * both Telegram and JavaScript string indices (an offset never bisects a
 * surrogate pair, so slicing is always safe).
 *
 * Entities are expected to nest, as Telegram sends them. A crossing entity (one
 * that starts inside another but ends after it) would yield invalid markup, so
 * it is dropped to plain text rather than emitted as crossing tags.
 */
interface Tagged {
  entity: RawMessageEntity;
  tags: { open: string; close: string };
}

export function entitiesToHtml(
  text: string,
  entities: RawMessageEntity[] = [],
): string {
  // Resolve tags upfront and drop entities that produce none; sort outer-first
  // at the same offset so nesting opens correctly (the scan closes inner-first).
  const items: Tagged[] = entities
    .filter((entity) => entity.length > 0)
    .map((entity) => ({ entity, tags: tagsFor(entity) }))
    .filter((item): item is Tagged => item.tags !== null)
    .sort(
      (a, b) =>
        a.entity.offset - b.entity.offset || b.entity.length - a.entity.length,
    );

  let result = '';
  let cursor = 0;
  const open: Tagged[] = [];

  const flushTo = (pos: number): void => {
    result += escapeHtml(text.slice(cursor, pos));
    cursor = pos;
  };

  const closeUntil = (limit: number): void => {
    // Close open entities (innermost first) that end at or before `limit`,
    // emitting the text up to each closing point.
    while (open.length && endOf(open[open.length - 1].entity) <= limit) {
      const item = open[open.length - 1];
      flushTo(endOf(item.entity));
      result += item.tags.close;
      open.pop();
    }
  };

  for (const item of items) {
    closeUntil(item.entity.offset);

    // After closing, the innermost still-open entity must fully contain this
    // one; if this entity ends past it, the two cross — skip it (leave as plain
    // text) rather than emit invalid crossing tags.
    const innermost = open[open.length - 1];
    if (innermost && endOf(innermost.entity) < endOf(item.entity)) {
      continue;
    }

    flushTo(item.entity.offset);
    result += item.tags.open;
    open.push(item);
  }

  closeUntil(text.length);
  flushTo(text.length);
  return result;
}

function endOf(entity: RawMessageEntity): number {
  return entity.offset + entity.length;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const SIMPLE_TAGS: Record<string, string> = {
  bold: 'b',
  italic: 'i',
  underline: 'u',
  strikethrough: 's',
  spoiler: 'tg-spoiler',
  code: 'code',
  blockquote: 'blockquote',
};

/** The open/close HTML for a formatting entity, or `null` to leave it as text. */
function tagsFor(
  entity: RawMessageEntity,
): { open: string; close: string } | null {
  const simple = SIMPLE_TAGS[entity.type];
  if (simple) {
    return { open: `<${simple}>`, close: `</${simple}>` };
  }

  if (entity.type === 'pre') {
    return entity.language
      ? {
          open: `<pre><code class="language-${entity.language}">`,
          close: '</code></pre>',
        }
      : { open: '<pre>', close: '</pre>' };
  }

  if (entity.type === 'text_link' && entity.url) {
    return { open: `<a href="${escapeHref(entity.url)}">`, close: '</a>' };
  }

  if (entity.type === 'text_mention' && entity.user) {
    return {
      open: `<a href="tg://user?id=${entity.user.id}">`,
      close: '</a>',
    };
  }

  return null;
}

function escapeHref(url: string): string {
  return escapeHtml(url).replace(/"/g, '&quot;');
}
