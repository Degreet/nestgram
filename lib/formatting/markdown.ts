import { RawMessageEntity } from '../events/raw-update.types';

/**
 * Render `text` + Telegram `MessageEntity[]` as a MarkdownV2 string (the inverse
 * of sending with `parse_mode: 'MarkdownV2'`). Escapes the reserved characters
 * so the plain text survives round-tripping.
 *
 * Only formatting entities produce markup; auto-detected ones stay plain.
 * Crossing (overlapping) entities are dropped to plain text rather than emitting
 * broken markup. `blockquote` (a line-prefix construct) is not represented and
 * is left as plain text.
 */
export function entitiesToMarkdown(
  text: string,
  entities: RawMessageEntity[] = [],
): string {
  const items: MdItem[] = entities
    .filter((entity) => entity.length > 0)
    .map((entity) => ({ entity, marks: marksFor(entity) }))
    .filter((item): item is MdItem => item.marks !== null)
    .sort(
      (a, b) =>
        a.entity.offset - b.entity.offset || b.entity.length - a.entity.length,
    );

  let result = '';
  let cursor = 0;
  const open: MdItem[] = [];

  const insideCode = (): boolean => open.some((item) => item.marks.code);

  const flushTo = (pos: number): void => {
    result += escapeText(text.slice(cursor, pos), insideCode());
    cursor = pos;
  };

  const closeUntil = (limit: number): void => {
    while (open.length && endOf(open[open.length - 1].entity) <= limit) {
      const item = open[open.length - 1];
      flushTo(endOf(item.entity));
      result += item.marks.close;
      open.pop();
    }
  };

  for (const item of items) {
    closeUntil(item.entity.offset);
    const innermost = open[open.length - 1];
    if (innermost && endOf(innermost.entity) < endOf(item.entity)) {
      continue; // crossing entity — leave as plain text
    }
    flushTo(item.entity.offset);
    result += item.marks.open;
    open.push(item);
  }

  closeUntil(text.length);
  flushTo(text.length);
  return result;
}

interface MdItem {
  entity: RawMessageEntity;
  marks: { open: string; close: string; code?: boolean };
}

function endOf(entity: RawMessageEntity): number {
  return entity.offset + entity.length;
}

const SIMPLE_MARKS: Record<string, string> = {
  bold: '*',
  italic: '_',
  underline: '__',
  strikethrough: '~',
  spoiler: '||',
};

/** The open/close MarkdownV2 for a formatting entity, or `null` for plain text. */
function marksFor(
  entity: RawMessageEntity,
): { open: string; close: string; code?: boolean } | null {
  const simple = SIMPLE_MARKS[entity.type];
  if (simple) {
    return { open: simple, close: simple };
  }

  if (entity.type === 'code') {
    return { open: '`', close: '`', code: true };
  }
  if (entity.type === 'pre') {
    return {
      open: `\`\`\`${entity.language ?? ''}\n`,
      close: '\n```',
      code: true,
    };
  }
  if (entity.type === 'text_link' && entity.url) {
    return { open: '[', close: `](${escapeUrl(entity.url)})` };
  }
  if (entity.type === 'text_mention' && entity.user) {
    return { open: '[', close: `](tg://user?id=${entity.user.id})` };
  }

  return null;
}

// Reserved in normal MarkdownV2 text.
const TEXT_SPECIAL = /[_*[\]()~`>#+\-=|{}.!\\]/g;
// Inside code / pre, only the backtick and backslash are special.
const CODE_SPECIAL = /[`\\]/g;

function escapeText(value: string, code: boolean): string {
  return value.replace(code ? CODE_SPECIAL : TEXT_SPECIAL, (c) => `\\${c}`);
}

function escapeUrl(url: string): string {
  return url.replace(/[)\\]/g, (c) => `\\${c}`);
}

interface OpenDelim {
  type: RawMessageEntity['type'];
  offset: number;
}

/**
 * Parse a MarkdownV2 string (as accepted by `parse_mode: 'MarkdownV2'`) into
 * plain text + Telegram `MessageEntity[]` — the inverse of
 * {@link entitiesToMarkdown}. Handles `\`-escapes, `*` `_` `__` `~` `||`
 * delimiters, `` ` `` code spans, ` ``` ` pre blocks (with an optional language
 * line), and `[label](url)` links. Inside code/pre only `` ` `` and `\` are
 * unescaped, matching how the Bot API treats them.
 *
 * Caveats: a `[…](url)` is always a `text_link` (a `tg://user?id=…` link still
 * works), formatting inside link labels isn't parsed, and unbalanced delimiters
 * are dropped — MarkdownV2 the Bot API would itself reject is best-effort.
 */
export function markdownToEntities(md: string): {
  text: string;
  entities: RawMessageEntity[];
} {
  const entities: RawMessageEntity[] = [];
  const open: OpenDelim[] = [];
  let text = '';
  let i = 0;
  const len = md.length;

  const toggle = (type: RawMessageEntity['type']): void => {
    const top = open[open.length - 1];
    if (top && top.type === type) {
      open.pop();
      const length = text.length - top.offset;
      if (length > 0) {
        entities.push({ type, offset: top.offset, length });
      }
    } else {
      open.push({ type, offset: text.length });
    }
  };

  const readCode = (start: number): number => {
    let j = start + 1;
    let content = '';
    while (j < len) {
      if (md[j] === '\\' && j + 1 < len) {
        content += md[j + 1];
        j += 2;
      } else if (md[j] === '`') {
        j += 1;
        break;
      } else {
        content += md[j];
        j += 1;
      }
    }
    if (content.length > 0) {
      entities.push({
        type: 'code',
        offset: text.length,
        length: content.length,
      });
      text += content;
    }
    return j;
  };

  const readPre = (start: number): number => {
    let j = start + 3;
    let language = '';
    while (j < len && md[j] !== '\n') {
      language += md[j];
      j += 1;
    }
    j += 1; // skip the language line's newline
    let content = '';
    while (j < len) {
      if (md.startsWith('```', j)) {
        j += 3;
        break;
      }
      if (md[j] === '\\' && j + 1 < len) {
        content += md[j + 1];
        j += 2;
      } else {
        content += md[j];
        j += 1;
      }
    }
    if (content.endsWith('\n')) {
      content = content.slice(0, -1); // the fence's leading newline
    }
    const entity: RawMessageEntity = {
      type: 'pre',
      offset: text.length,
      length: content.length,
    };
    if (language) {
      entity.language = language;
    }
    entities.push(entity);
    text += content;
    return j;
  };

  const readLink = (start: number): number => {
    let j = start + 1;
    let label = '';
    while (j < len) {
      if (md[j] === '\\' && j + 1 < len) {
        label += md[j + 1];
        j += 2;
      } else if (md[j] === ']') {
        j += 1;
        break;
      } else {
        label += md[j];
        j += 1;
      }
    }
    if (md[j] !== '(') {
      text += '['; // not a link — keep the bracket, re-parse the rest
      return start + 1;
    }
    j += 1;
    let url = '';
    while (j < len) {
      if (md[j] === '\\' && j + 1 < len) {
        url += md[j + 1];
        j += 2;
      } else if (md[j] === ')') {
        j += 1;
        break;
      } else {
        url += md[j];
        j += 1;
      }
    }
    if (label.length > 0) {
      entities.push({
        type: 'text_link',
        offset: text.length,
        length: label.length,
        url,
      });
      text += label;
    }
    return j;
  };

  while (i < len) {
    const c = md[i];
    if (c === '\\' && i + 1 < len) {
      text += md[i + 1];
      i += 2;
    } else if (md.startsWith('```', i)) {
      i = readPre(i);
    } else if (c === '`') {
      i = readCode(i);
    } else if (c === '[') {
      i = readLink(i);
    } else if (md.startsWith('||', i)) {
      toggle('spoiler');
      i += 2;
    } else if (md.startsWith('__', i)) {
      toggle('underline');
      i += 2;
    } else if (c === '*') {
      toggle('bold');
      i += 1;
    } else if (c === '_') {
      toggle('italic');
      i += 1;
    } else if (c === '~') {
      toggle('strikethrough');
      i += 1;
    } else {
      text += c;
      i += 1;
    }
  }

  return { text, entities };
}
