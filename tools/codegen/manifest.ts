/**
 * Hand-owned overrides — the permanent manual seam between generated code and
 * the framework's ergonomic layer. The generator consults this for:
 *
 * 1. Which spec objects are NOT emitted as `Raw*` wire types because a
 *    hand-written class already owns the bare name (`User`, `InputFile`,
 *    `InputMedia*`), and how a `reference` to them resolves.
 * 2. Per-method `wrap()` bodies + rich return types that build `Message` events
 *    — spliced in verbatim so regenerating a file never clobbers the
 *    hand-authored ergonomic glue. A new method that should return a rich event
 *    needs a new entry here (the deliberate manual step).
 */

import type { IrType } from './ir';

const RAW_PREFIX = 'Raw';

/**
 * Spec object names that resolve to an existing hand-written declaration
 * instead of a generated `Raw*` interface. `InputFile` is the multipart
 * sentinel (`lib/api/input-file.ts`); `InputMedia*` are hand-written
 * (`lib/api/input-media.ts`); `User` stays bare (`lib/events/user.ts`).
 */
const INPUT_MEDIA_NAMES: ReadonlySet<string> = new Set([
  'InputMediaAudio',
  'InputMediaDocument',
  'InputMediaPhoto',
  'InputMediaVideo',
  'InputMediaAnimation',
  'InputMediaLivePhoto',
]);

const BARE_REFERENCES: ReadonlySet<string> = new Set<string>([
  'User',
  'InputFile',
  ...INPUT_MEDIA_NAMES,
]);

/** Objects the type emitter must NOT emit (a hand-written declaration owns them). */
export const SKIP_OBJECTS: ReadonlySet<string> = BARE_REFERENCES;

/** Resolve a spec object reference to its TS type name (`Chat` → `RawChat`). */
export function resolveReference(name: string): string {
  return BARE_REFERENCES.has(name) ? name : `${RAW_PREFIX}${name}`;
}

export function isInputMediaName(name: string): boolean {
  return INPUT_MEDIA_NAMES.has(name);
}

/**
 * Widens specific field types beyond their literal spec shape. The keyboard
 * builders (`InlineKeyboard`, …) are passed as `reply_markup` and serialize via
 * `toJSON()`, so they are not structurally the raw markup union — accept any
 * `{ toJSON() }` alongside it so a builder instance type-checks.
 */
export function applyFieldTypeOverride(
  fieldName: string,
  tsType: string,
): string {
  if (fieldName === 'reply_markup') {
    return `${tsType} | { toJSON(): unknown }`;
  }
  return tsType;
}

// --- IR-level field-type reconstruction --------------------------------------

const INPUT_MEDIA_ARRAY: IrType = {
  kind: 'array',
  element: { kind: 'reference', name: 'InputMedia' },
};

/**
 * An IR type that replaces a field's source-derived type, or `undefined` to keep
 * it. Keyed by `<OwnerType|methodName>.<field>`.
 *
 * `sendMediaGroup.media` is a union-of-arrays in the source (`X[] | Y[] | …`);
 * the usable shape is one array of the `InputMedia` union, so a mixed-media
 * array type-checks. (File-upload fields under-typed as `String` are widened in
 * `ir.ts` from their `attach://` description, not listed here.)
 */
export function overrideFieldType(
  owner: string,
  field: string,
): IrType | undefined {
  return `${owner}.${field}` === 'sendMediaGroup.media'
    ? INPUT_MEDIA_ARRAY
    : undefined;
}

// --- Enum literal-union recovery ---------------------------------------------

/**
 * The PaulSonOfLars source carries no structured enumerations — a field's
 * allowed values live only in `description` prose, in too many phrasings to
 * parse safely. So the stable, well-known string enums are restored from this
 * explicit table instead (the discriminator literals of subtype members ARE
 * recovered from prose in `ir.ts`, since their phrasing is uniform).
 *
 * This table is intentionally NON-exhaustive: a field absent here simply keeps
 * its base `string` type — a safe degradation, never a wrong type. Only list
 * enums Telegram is unlikely to extend, since a closed union would otherwise
 * REJECT a newly-added valid value. Keyed by `<methodName|OwnerType>.<field>`,
 * or `*.<field>` for an owner-agnostic field (e.g. `parse_mode` everywhere).
 */
const CHAT_TYPES = ['private', 'group', 'supergroup', 'channel'];
const STICKER_FORMATS = ['static', 'animated', 'video'];
const THUMB_MIME_TYPES = ['image/jpeg', 'image/gif', 'video/mp4'];

const ENUM_LITERALS: Readonly<Record<string, readonly string[]>> = {
  '*.parse_mode': ['HTML', 'Markdown', 'MarkdownV2'],
  'sendDice.emoji': ['🎲', '🎯', '🏀', '⚽', '🎳', '🎰'],
  'sendPoll.type': ['quiz', 'regular'],
  'Chat.type': CHAT_TYPES,
  'ChatFullInfo.type': CHAT_TYPES,
  'InputSticker.format': STICKER_FORMATS,
  'setStickerSetThumbnail.format': STICKER_FORMATS,
  'uploadStickerFile.sticker_format': STICKER_FORMATS,
  'InlineQueryResultGif.thumbnail_mime_type': THUMB_MIME_TYPES,
  'InlineQueryResultMpeg4Gif.thumbnail_mime_type': THUMB_MIME_TYPES,
};

/** The literal values for an enum field, or `undefined` to keep its base type. */
export function enumLiterals(
  owner: string,
  field: string,
): readonly string[] | undefined {
  return ENUM_LITERALS[`${owner}.${field}`] ?? ENUM_LITERALS[`*.${field}`];
}

// --- BotService method generation --------------------------------------------

/**
 * Methods the generator must NOT emit as a `bot.<method>()` wrapper because
 * BotService hand-owns them with logic the rule can't reproduce:
 * - `getMe` caches the bot identity (backs `username`/`deepLink`);
 * - `getFile` anchors the file-download cluster (`fileLink`/`fileStream`/…).
 * The inline/chat dual edit methods are generated with target-first overloads
 * (see emit-bot-methods `inlineDualContent`), so they are no longer skipped.
 */
const SKIP_BOT_METHODS: ReadonlySet<string> = new Set<string>([
  'getMe',
  'getFile',
]);

export function isSkippedBotMethod(methodName: string): boolean {
  return SKIP_BOT_METHODS.has(methodName);
}

// --- Per-method rich-event overrides -----------------------------------------

const WRAP_SINGLE = `wrap(raw: unknown, bot: BotService): Message {
  return new Message(bot, raw as Partial<Message>);
}`;

const WRAP_ARRAY = `wrap(raw: unknown, bot: BotService): Message[] {
  return (raw as Partial<Message>[]).map((object) => new Message(bot, object));
}`;

const WRAP_EDITABLE = `wrap(raw: unknown, bot: BotService): Message | true {
  return typeof raw === 'object' && raw !== null
    ? new Message(bot, raw as Partial<Message>)
    : true;
}`;

export interface MethodOverride {
  /** The `TResult` type argument (a rich type the wrap produces). */
  returnType: string;
  /** The verbatim `wrap()` method body. */
  wrap: string;
}

/**
 * Methods whose result is enriched into a rich `Message`. Everything else
 * returns the raw `data.result` verbatim (BotService falls through when there
 * is no `wrap`).
 */
const METHOD_OVERRIDES: Readonly<Record<string, MethodOverride>> = {
  sendMessage: { returnType: 'Message', wrap: WRAP_SINGLE },
  forwardMessage: { returnType: 'Message', wrap: WRAP_SINGLE },
  sendPhoto: { returnType: 'Message', wrap: WRAP_SINGLE },
  sendMediaGroup: { returnType: 'Message[]', wrap: WRAP_ARRAY },
  editMessageText: { returnType: 'Message | true', wrap: WRAP_EDITABLE },
  editMessageReplyMarkup: { returnType: 'Message | true', wrap: WRAP_EDITABLE },
};

export function getMethodOverride(
  methodName: string,
): MethodOverride | undefined {
  return METHOD_OVERRIDES[methodName];
}
