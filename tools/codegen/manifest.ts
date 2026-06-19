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
  'sendDice.emoji': ['🎲', '🎯', '🏀', '⚽', '🎳', '🎰'],
  'sendPoll.type': ['quiz', 'regular'],
  'answerChatJoinRequestQuery.result': ['approve', 'decline', 'queue'],
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

/**
 * Enum fields promoted to a NAMED, hand-owned exported type instead of an inline
 * literal union — for values referenced widely enough to deserve a name. The
 * type itself is hand-written (e.g. `ParseModeValue` in lib/api/parse-mode.ts);
 * the manifest only names it at the field position, and the emitter adds the
 * import from {@link NAMED_TYPE_MODULES}. Keyed like {@link ENUM_LITERALS}.
 */
const NAMED_TYPES: Readonly<Record<string, string>> = {
  '*.parse_mode': 'ParseModeValue',
  'InlineKeyboardButton.style': 'ButtonStyleValue',
  'KeyboardButton.style': 'ButtonStyleValue',
};

/** The named type a field is promoted to, or `undefined` for a plain field. */
export function namedTypeFor(owner: string, field: string): string | undefined {
  return NAMED_TYPES[`${owner}.${field}`] ?? NAMED_TYPES[`*.${field}`];
}

/**
 * Where each named type is imported from, as a path RELATIVE TO the generated
 * types file (`lib/events/raw-update.types.ts`) — the emitter groups its imports
 * by this. (The bot-methods emitter imports its sole named type separately, from
 * its own file depth.)
 */
const NAMED_TYPE_MODULES: Readonly<Record<string, string>> = {
  ParseModeValue: '../api/parse-mode',
  ButtonStyleValue: '../keyboards/button-style',
};

/** The import path for a named type, or throws if one was added without a home. */
export function namedTypeModule(typeName: string): string {
  const module = NAMED_TYPE_MODULES[typeName];
  if (module === undefined) {
    throw new Error(
      `Named type '${typeName}' has no entry in NAMED_TYPE_MODULES — add its import path.`,
    );
  }
  return module;
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
  return new Message(bot, raw as Partial<RawMessage>);
}`;

const WRAP_ARRAY = `wrap(raw: unknown, bot: BotService): Message[] {
  return (raw as Partial<RawMessage>[]).map(
    (object) => new Message(bot, object),
  );
}`;

// Methods that edit a message in place and so return `Message | true`. The
// engine's result-handler mirrors this set (see `isEditInPlace` in
// lib/engine/execution/result-handler.ts) to auto-target a returned edit command
// at the callback message — keep the two in sync when adding an editable method.
const WRAP_EDITABLE = `wrap(raw: unknown, bot: BotService): Message | true {
  return typeof raw === 'object' && raw !== null
    ? new Message(bot, raw as Partial<RawMessage>)
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
  sendRichMessage: { returnType: 'Message', wrap: WRAP_SINGLE },
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

// --- Forced positional content ------------------------------------------------

/**
 * A required positional content slot fed by two mutually-exclusive spec
 * fields (inline/chat dual methods only). Bot API 10.1 made
 * `editMessageText.text` and `rich_message` each "required if the other
 * isn't specified" — the spec marks both optional, but a call without either
 * is invalid. The sugar models that as one required positional slot: a string
 * fills `stringField`, an object fills `objectField`. The generator refuses
 * to emit if a spec change ever makes this dispatch unsound (see
 * emit-bot-methods `inlineDualContent`).
 */
export interface PositionalContentSlot {
  /** Plain-string field the slot fills when the arg is a string. */
  stringField: string;
  /** Object field the slot fills otherwise. */
  objectField: string;
}

const FORCED_POSITIONAL_CONTENT: Readonly<
  Record<string, PositionalContentSlot>
> = {
  editMessageText: { stringField: 'text', objectField: 'rich_message' },
};

export function forcedPositionalSlot(
  methodName: string,
): PositionalContentSlot | undefined {
  return FORCED_POSITIONAL_CONTENT[methodName];
}

/** Every method with a forced slot — the emitter asserts none goes stale. */
export function forcedPositionalMethodNames(): readonly string[] {
  return Object.keys(FORCED_POSITIONAL_CONTENT);
}
