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

/**
 * Where each skipped object's hand-written declaration lives — the prose above,
 * made machine-readable so the generator can cross-check those files against the
 * spec.
 *
 * Needed because `SKIP_OBJECTS` means the emitter never writes these, and the
 * `--check` staleness guard only diffs *emitted* output: a field Telegram adds
 * to `User` or `InputMediaVideo` would otherwise go missing silently, forever.
 */
export const HAND_OWNED_DECLARATIONS: ReadonlyMap<string, string> = new Map<
  string,
  string
>([
  ['User', 'lib/events/user.ts'],
  ['InputFile', 'lib/api/input-file.ts'],
  ...[...INPUT_MEDIA_NAMES].map((name): [string, string] => [
    name,
    'lib/api/input-media.ts',
  ]),
]);

// A skip with nowhere to check it is exactly the blind spot this table closes.
for (const name of SKIP_OBJECTS) {
  if (!HAND_OWNED_DECLARATIONS.has(name)) {
    throw new Error(
      `skipped object '${name}' has no entry in HAND_OWNED_DECLARATIONS`,
    );
  }
}

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
 * Both tables are intentionally NON-exhaustive: a field absent from both simply
 * keeps its base `string` type — a safe degradation, never a wrong type. Keyed by
 * `<methodName|OwnerType>.<field>`, or `*.<field>` for an owner-agnostic field
 * (e.g. `parse_mode` everywhere).
 */
const CHAT_TYPES = ['private', 'group', 'supergroup', 'channel'];
const STICKER_FORMATS = ['static', 'animated', 'video'];
const STICKER_TYPES = ['regular', 'mask', 'custom_emoji'];
const THUMB_MIME_TYPES = ['image/jpeg', 'image/gif', 'video/mp4'];
const RICH_BUTTON_STYLES = ['danger', 'success', 'primary', 'link'];
const HORIZONTAL_ALIGNMENTS = ['left', 'center', 'right'];
const VERTICAL_ALIGNMENTS = ['top', 'middle', 'bottom'];
const ORDERED_LIST_LABELS = ['a', 'A', 'i', 'I', '1'];
/** Telegram Stars and TON — every currency a suggested post or a gift is priced in. */
const POST_CURRENCIES = ['XTR', 'TON'];

/**
 * Every emoji Telegram currently accepts as a reaction. Transcribed from prose
 * like every other entry here, and checked against it by the gate — which
 * compares sets, so the doc order kept below is for the reader, not a contract.
 */
const REACTION_EMOJI = [
  '❤',
  '👍',
  '👎',
  '🔥',
  '🥰',
  '👏',
  '😁',
  '🤔',
  '🤯',
  '😱',
  '🤬',
  '😢',
  '🎉',
  '🤩',
  '🤮',
  '💩',
  '🙏',
  '👌',
  '🕊',
  '🤡',
  '🥱',
  '🥴',
  '😍',
  '🐳',
  '❤‍🔥',
  '🌚',
  '🌭',
  '💯',
  '🤣',
  '⚡',
  '🍌',
  '🏆',
  '💔',
  '🤨',
  '😐',
  '🍓',
  '🍾',
  '💋',
  '🖕',
  '😈',
  '😴',
  '😭',
  '🤓',
  '👻',
  '👨‍💻',
  '👀',
  '🎃',
  '🙈',
  '😇',
  '😨',
  '🤝',
  '✍',
  '🤗',
  '🫡',
  '🎅',
  '🎄',
  '☃',
  '💅',
  '🤪',
  '🗿',
  '🆒',
  '💘',
  '🙉',
  '🦄',
  '😘',
  '💊',
  '🙊',
  '😎',
  '👾',
  '🤷‍♂',
  '🤷',
  '🤷‍♀',
  '😡',
];

// Telegram Passport sections. Each error class accepts only the subset it can
// describe, which is why these are several lists and not one: a `front_side`
// error is meaningless for a utility bill, and the type should say so.
const IDENTITY_DOCUMENTS = [
  'passport',
  'driver_license',
  'identity_card',
  'internal_passport',
];
const PERSONAL_DOCUMENTS = [
  ...IDENTITY_DOCUMENTS,
  'personal_details',
  'address',
];
const ADDRESS_DOCUMENTS = [
  'utility_bill',
  'bank_statement',
  'rental_agreement',
  'passport_registration',
  'temporary_registration',
];
const TRANSLATABLE_DOCUMENTS = [...IDENTITY_DOCUMENTS, ...ADDRESS_DOCUMENTS];
const PASSPORT_ELEMENTS = [
  ...PERSONAL_DOCUMENTS,
  ...ADDRESS_DOCUMENTS,
  'phone_number',
  'email',
];

/**
 * CLOSED enums — the value is exactly one of these literals. Only list a field
 * here when Telegram is unlikely to extend the set, since a closed union REJECTS
 * a newly-added valid value; a hedged/extensible enum belongs in
 * {@link OPEN_ENUM_LITERALS} instead.
 */
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
  // Not ButtonStyleValue: a rich button also allows 'link', which a keyboard
  // button does not, so promoting it to the shared named type would either drop
  // 'link' or wrongly widen every InlineKeyboardButton.
  'RichMessageButton.style': RICH_BUTTON_STYLES,
  'createNewStickerSet.sticker_type': STICKER_TYPES,
  'InlineQueryResultDocument.mime_type': ['application/pdf', 'application/zip'],
  // Reachable inbound through Sticker.mask_position, so closing it needs the
  // stability argument: these four face points have not moved since masks
  // shipped, and a face has no fifth part to add.
  'MaskPosition.point': ['forehead', 'eyes', 'mouth', 'chin'],
  // Closed in both directions, including the inbound half: the prose carries no
  // "currently", and `a | A | i | I | 1` is exactly HTML's `<ol type>` set, so
  // Telegram adopted a vocabulary that was already fixed elsewhere rather than
  // opening one of its own. (Its siblings RichBlockButtons.align and
  // RichBlockTableCell.align/valign ARE hedged — those stay open below.)
  'InputRichBlockListItem.type': ORDERED_LIST_LABELS,
  'RichBlockListItem.type': ORDERED_LIST_LABELS,
  // Inbound, and closed for the same reason Chat.type above is: the four chat
  // kinds are the most settled vocabulary in the API. 'sender' is the one extra
  // an inline query reports — the sender's own private chat, which Chat.type
  // never names.
  'InlineQuery.chat_type': ['sender', ...CHAT_TYPES],
  // Telegram Passport, inbound: closed on stability alone. The set has not moved
  // since Passport shipped, which is the only argument that licenses closing a
  // field we READ — the risk here is a union falsely claiming exhaustiveness.
  'EncryptedPassportElement.type': PASSPORT_ELEMENTS,
  // The rest are outbound, passed to setPassportDataErrors, where the risk runs
  // the other way: a wrong string costs a silently rejected error report.
  'PassportElementErrorDataField.type': PERSONAL_DOCUMENTS,
  'PassportElementErrorFrontSide.type': IDENTITY_DOCUMENTS,
  'PassportElementErrorReverseSide.type': ['driver_license', 'identity_card'],
  'PassportElementErrorSelfie.type': IDENTITY_DOCUMENTS,
  'PassportElementErrorFile.type': ADDRESS_DOCUMENTS,
  'PassportElementErrorFiles.type': ADDRESS_DOCUMENTS,
  'PassportElementErrorTranslationFile.type': TRANSLATABLE_DOCUMENTS,
  'PassportElementErrorTranslationFiles.type': TRANSLATABLE_DOCUMENTS,
};

/**
 * OPEN enums — the known values PLUS `(string & Record<never, never>)`, so an
 * unmodelled future value still type-checks as `string` while the known literals
 * keep autocomplete. For INBOUND fields whose set Telegram hedges as "Currently,
 * one of…" — the "non-exhaustive, never wrong" contract at the type level, where
 * a closed union would falsely claim exhaustiveness over the wire.
 */
const OPEN_ENUM_LITERALS: Readonly<Record<string, readonly string[]>> = {
  'BotSubscriptionUpdated.state': ['canceled', 'active', 'failed'],
  'RichBlockButtons.align': HORIZONTAL_ALIGNMENTS,
  'InputRichBlockButtons.align': HORIZONTAL_ALIGNMENTS,
  'RichBlockTableCell.align': HORIZONTAL_ALIGNMENTS,
  'RichBlockTableCell.valign': VERTICAL_ALIGNMENTS,
  // Not the EntityType in lib/engine/matching: that names only the entities the
  // listeners route on, deliberately omitting the formatting ones. Promoting to
  // it would drop 'bold' and its neighbours from the wire type.
  'MessageEntity.type': [
    'mention',
    'hashtag',
    'cashtag',
    'bot_command',
    'url',
    'email',
    'phone_number',
    'bold',
    'italic',
    'underline',
    'strikethrough',
    'spoiler',
    'blockquote',
    'expandable_blockquote',
    'code',
    'pre',
    'text_link',
    'text_mention',
    'custom_emoji',
    'date_time',
  ],
  // The outbound half (sendPoll.type) is closed above: Telegram hedges what it
  // may SEND, not what it accepts.
  'Poll.type': ['regular', 'quiz'],
  'Sticker.type': STICKER_TYPES,
  'StickerSet.sticker_type': STICKER_TYPES,
  // Long, and worth it: message.react() takes its argument from this union, so
  // an author gets the whole reaction set as autocomplete instead of guessing.
  // Open, so an emoji Telegram adds before we regenerate still type-checks.
  'ReactionTypeEmoji.emoji': REACTION_EMOJI,
  'SuggestedPostInfo.state': ['pending', 'approved', 'declined'],
  'SuggestedPostPaid.currency': POST_CURRENCIES,
  'SuggestedPostPrice.currency': POST_CURRENCIES,
  'SuggestedPostRefunded.reason': ['post_deleted', 'payment_refunded'],
  'TransactionPartnerUser.transaction_type': [
    'invoice_payment',
    'paid_media_payment',
    'gift_purchase',
    'premium_purchase',
    'business_account_transfer',
  ],
  'UniqueGiftInfo.last_resale_currency': POST_CURRENCIES,
  'UniqueGiftInfo.origin': [
    'upgrade',
    'transfer',
    'resale',
    'gifted_upgrade',
    'offer',
  ],
  'UniqueGiftModel.rarity': ['uncommon', 'rare', 'epic', 'legendary'],
};

// A field in both tables would silently resolve CLOSED (enumLiterals checks
// ENUM_LITERALS first), masking the intended open union — fail loudly instead.
for (const key of Object.keys(OPEN_ENUM_LITERALS)) {
  if (key in ENUM_LITERALS) {
    throw new Error(
      `enum field '${key}' is in both ENUM_LITERALS and OPEN_ENUM_LITERALS`,
    );
  }
}

/** An enum field's literals, and whether the union stays open to other strings. */
export interface EnumResolution {
  literals: readonly string[];
  open: boolean;
}

/** The enum resolution for a field, or `undefined` to keep its base type. */
export function enumLiterals(
  owner: string,
  field: string,
): EnumResolution | undefined {
  const closed =
    ENUM_LITERALS[`${owner}.${field}`] ?? ENUM_LITERALS[`*.${field}`];
  if (closed) {
    return { literals: closed, open: false };
  }
  const open =
    OPEN_ENUM_LITERALS[`${owner}.${field}`] ?? OPEN_ENUM_LITERALS[`*.${field}`];
  if (open) {
    return { literals: open, open: true };
  }
  return undefined;
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

/**
 * Every enum entry, closed and open alike, as `['<owner>.<field>', literals]`.
 * Both tables, because an open union's known values go stale exactly like a
 * closed one's — only the fallback differs. Consumed by the generator's gate,
 * which re-reads each field's spec prose and fails when the sets diverge.
 */
export function enumLiteralEntries(): readonly (readonly [
  string,
  readonly string[],
])[] {
  return [
    ...Object.entries(ENUM_LITERALS),
    ...Object.entries(OPEN_ENUM_LITERALS),
  ];
}

/** Every named-type promotion, as `['<owner>.<field>', typeName]` pairs. */
export function namedTypeEntries(): readonly (readonly [string, string])[] {
  return Object.entries(NAMED_TYPES);
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
  editMessageMedia: { returnType: 'Message | true', wrap: WRAP_EDITABLE },
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
