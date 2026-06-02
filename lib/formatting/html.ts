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
          open: `<pre><code class="language-${escapeHref(entity.language)}">`,
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

/** Telegram-supported tags → entity type (with their HTML aliases). */
const TYPE_BY_TAG: Record<string, string> = {
  b: 'bold',
  strong: 'bold',
  i: 'italic',
  em: 'italic',
  u: 'underline',
  ins: 'underline',
  s: 'strikethrough',
  strike: 'strikethrough',
  del: 'strikethrough',
  'tg-spoiler': 'spoiler',
  code: 'code',
  pre: 'pre',
  blockquote: 'blockquote',
};

interface OpenTag {
  tag: string;
  /** Entity type to emit on close, or null to just track for matching. */
  type: string | null;
  offset: number;
  url?: string;
  language?: string;
  /** A `<code>` inside `<pre>` only carries the language — it emits no entity. */
  skip?: boolean;
}

const TAG = /<(\/)?\s*([a-zA-Z0-9-]+)((?:\s+[^>]*)?)\/?>/g;
const HREF = /href\s*=\s*"([^"]*)"/i;
const CLASS = /class\s*=\s*"([^"]*)"/i;

/**
 * Parse an HTML string (as accepted by `parse_mode: 'HTML'`) into plain text +
 * Telegram `MessageEntity[]` — the inverse of {@link entitiesToHtml}. Supports
 * the Bot API's tag set and aliases (b/strong, i/em, u/ins, s/strike/del, code,
 * pre + `<code class="language-…">`, a, tg-spoiler, blockquote). Unknown tags
 * are ignored (their text is kept). Expects well-nested input.
 *
 * Caveats: every `<a>` becomes a `text_link` — HTML can't carry the full `User`
 * a `text_mention` needs, but a `tg://user?id=…` link works the same. Only the
 * core references (`&lt; &gt; &amp; &quot; &#39;`) are decoded, and a raw `>`
 * inside an attribute value isn't supported (Telegram never emits one).
 */
export function htmlToEntities(html: string): {
  text: string;
  entities: RawMessageEntity[];
} {
  const entities: RawMessageEntity[] = [];
  const stack: OpenTag[] = [];
  let text = '';
  let last = 0;
  let match: RegExpExecArray | null;

  TAG.lastIndex = 0;
  while ((match = TAG.exec(html)) !== null) {
    text += decodeHtml(html.slice(last, match.index));
    last = TAG.lastIndex;

    const closing = match[1] === '/';
    const tag = match[2].toLowerCase();
    const attrs = match[3] ?? '';

    if (closing) {
      closeTag(tag, stack, entities, text.length);
    } else {
      openTag(tag, attrs, stack, text.length);
    }
  }
  text += decodeHtml(html.slice(last));

  return { text, entities };
}

function openTag(
  tag: string,
  attrs: string,
  stack: OpenTag[],
  offset: number,
): void {
  if (tag === 'a') {
    const href = HREF.exec(attrs)?.[1];
    stack.push({
      tag,
      type: 'text_link',
      offset,
      url: href === undefined ? undefined : decodeHtml(href),
    });
    return;
  }
  if (tag === 'span') {
    const spoiler = CLASS.exec(attrs)?.[1]?.includes('tg-spoiler');
    stack.push({ tag, type: spoiler ? 'spoiler' : null, offset });
    return;
  }
  if (tag === 'code' && stack[stack.length - 1]?.tag === 'pre') {
    // `<code class="language-x">` inside `<pre>` sets the pre's language.
    const cls = CLASS.exec(attrs)?.[1] ?? '';
    const language = /(?:^|\s)language-(\S+)/.exec(cls)?.[1];
    if (language) {
      stack[stack.length - 1].language = language;
    }
    stack.push({ tag, type: null, offset, skip: true });
    return;
  }
  stack.push({ tag, type: TYPE_BY_TAG[tag] ?? null, offset });
}

function closeTag(
  tag: string,
  stack: OpenTag[],
  entities: RawMessageEntity[],
  offset: number,
): void {
  // Find the matching open (nearest), tolerating stray/unknown closers.
  let i = stack.length - 1;
  while (i >= 0 && stack[i].tag !== tag) {
    i--;
  }
  if (i < 0) {
    return;
  }
  const open = stack.splice(i, 1)[0];

  if (open.skip || open.type === null || offset <= open.offset) {
    return;
  }
  const entity: RawMessageEntity = {
    type: open.type,
    offset: open.offset,
    length: offset - open.offset,
  };
  if (open.url !== undefined) {
    entity.url = open.url;
  }
  if (open.language !== undefined) {
    entity.language = open.language;
  }
  entities.push(entity);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}
