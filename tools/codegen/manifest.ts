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

// --- Multipart media handling ------------------------------------------------

/** Multipart-transport shape for a method's file field(s). */
export type MediaConfig =
  | { kind: 'flat'; fields: string[] }
  | { kind: 'nested'; field: string; itemField: string; array: boolean };

/**
 * Multipart methods whose nested file field the spec-driven derivation can't
 * infer: the spec models the inner file as a plain `string` (attach://) even
 * though the hand-written / generated type accepts an `InputFile`. Declared
 * explicitly. (`sendPaidMedia` is intentionally absent — `InputPaidMedia` has
 * no InputFile-typed field at all, so there is nothing to detect.)
 */
const MEDIA_OVERRIDES: Readonly<Record<string, MediaConfig>> = {
  editMessageMedia: {
    kind: 'nested',
    field: 'media',
    itemField: 'media',
    array: false,
  },
  createNewStickerSet: {
    kind: 'nested',
    field: 'stickers',
    itemField: 'sticker',
    array: true,
  },
  addStickerToSet: {
    kind: 'nested',
    field: 'sticker',
    itemField: 'sticker',
    array: false,
  },
  replaceStickerInSet: {
    kind: 'nested',
    field: 'sticker',
    itemField: 'sticker',
    array: false,
  },
};

export function getMediaOverride(methodName: string): MediaConfig | undefined {
  return MEDIA_OVERRIDES[methodName];
}

// --- BotService method generation --------------------------------------------

/**
 * Methods the generator must NOT emit as a `bot.<method>()` wrapper because
 * BotService hand-owns them with logic the rule can't reproduce:
 * - `getMe` caches the bot identity (backs `username`/`deepLink`);
 * - `getFile` anchors the file-download cluster (`fileLink`/`fileStream`/…);
 * - `editMessageText`/`editMessageReplyMarkup` deliberately promote the
 *   *optional* `chat_id`/`message_id` to positional args for the common edit —
 *   the "required → positional" rule would drop them.
 * Everything else is generated (required args positional, optional via options).
 */
const SKIP_BOT_METHODS: ReadonlySet<string> = new Set<string>([
  'getMe',
  'getFile',
  'editMessageText',
  'editMessageReplyMarkup',
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
