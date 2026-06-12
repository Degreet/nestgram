/**
 * Emits `lib/api/generated-bot-methods.ts`: one `bot.<method>(...)` wrapper per
 * Bot API method that BotService doesn't hand-own (see manifest SKIP_BOT_METHODS).
 *
 * The shape mirrors the hand-written sugar: REQUIRED args are positional, the
 * OPTIONAL ones go in a trailing `options` object (which also carries the
 * per-call `token`/`signal`). Positional param types are written as indexed
 * access into the method's Options interface (`SendMessageOptions['chat_id']`),
 * so the file only needs to import the method classes + their Options — no Raw
 * types, InputFile, or InputMedia imports, and no cast (positional supplies the
 * required fields, the spread supplies the optional ones).
 *
 * Output is unformatted; the orchestrator runs Prettier so the committed file
 * matches lint-staged.
 */
import { IrField, IrMethod, IrType } from './ir';
import {
  forcedPositionalMethodNames,
  forcedPositionalSlot,
  isSkippedBotMethod,
  PositionalContentSlot,
} from './manifest';
import { sanitize } from './jsdoc';

/** Methods that target a message by chat_id+message_id OR inline_message_id. */
const INLINE_TRIO = ['chat_id', 'message_id', 'inline_message_id'] as const;

function couldBeNumber(type: IrType): boolean {
  if (type.kind === 'primitive') {
    return type.ts === 'number';
  }
  if (type.kind === 'union') {
    return type.variants.some(couldBeNumber);
  }
  return false;
}

function isPlainString(type: IrType): boolean {
  return type.kind === 'primitive' && type.ts === 'string';
}

/** The resolved positional shape of an inline/chat dual method. */
type DualShape =
  | { kind: 'plain'; content: IrField | null }
  | { kind: 'slot'; text: IrField; object: IrField };

/**
 * Validates a manifest-forced slot against the spec and resolves its fields.
 * A forced slot is a public-signature promise — any way the spec could
 * silently break its runtime dispatch must fail the generate run, not
 * degrade the emit.
 */
function resolveForcedSlot(
  method: IrMethod,
  slot: PositionalContentSlot,
  byName: Map<string, IrField>,
): DualShape {
  const fail = (reason: string): never => {
    throw new Error(`${method.name} forced positional slot: ${reason}`);
  };

  const text = byName.get(slot.stringField);
  // `typeof === 'string'` is the dispatch — only a plain string is sound, and
  // only an optional one (a required field needs no forcing, and the spec
  // marking it required again would make the object alternative unreachable).
  if (!text || !text.optional || !isPlainString(text.type)) {
    fail(`\`${slot.stringField}\` must be an optional plain string arg`);
  }

  const object = byName.get(slot.objectField);
  if (!object || !object.optional) {
    fail(`the spec has no optional \`${slot.objectField}\` arg`);
  }
  // The non-string branch of the dispatch fills the object field — its type
  // must never itself be a string.
  if (object!.type.kind !== 'reference') {
    fail(`\`${slot.objectField}\` must reference a spec object`);
  }

  return { kind: 'slot', text: text!, object: object! };
}

/**
 * If `method` is the inline/chat dual shape (the trio all optional) AND its
 * positional content disambiguates from a numeric `message_id` at runtime,
 * returns that shape — the signal to emit the ergonomic target-first
 * overloads. Content is the required arg (0 or 1) or a manifest-forced slot
 * (two mutually-exclusive spec fields modeled as one required positional).
 * Otherwise null (the method is emitted as a normal options-only wrapper).
 */
function inlineDualContent(method: IrMethod): DualShape | null {
  const forced = forcedPositionalSlot(method.name);
  const byName = new Map(method.args.map((arg) => [arg.name, arg]));

  const trio = INLINE_TRIO.map((name) => byName.get(name));
  if (trio.some((field) => !field || !field.optional)) {
    if (forced) {
      throw new Error(
        `${method.name} has a forced positional slot but lost the inline/chat dual shape`,
      );
    }
    return null;
  }

  const requiredContent = method.args.filter((arg) => !arg.optional);
  if (forced) {
    if (requiredContent.length > 0) {
      throw new Error(
        `${method.name} has a forced positional slot but the spec also has required content — the slot would be ambiguous`,
      );
    }
    return resolveForcedSlot(method, forced, byName);
  }

  // The `typeof second === 'number'` dispatch (number ⇒ message_id) is only safe
  // when the content arg can't itself be a number, and the template only
  // handles one positional content arg.
  if (requiredContent.length > 1) {
    return null;
  }
  if (requiredContent.length === 1 && couldBeNumber(requiredContent[0].type)) {
    return null;
  }
  return { kind: 'plain', content: requiredContent[0] ?? null };
}

/** Emit the inline/chat overload pair + the dispatching implementation. */
function emitInlineDual(method: IrMethod, shape: DualShape): string {
  const { className, name } = method;
  // NonNullable: the trio fields are optional in *Options, but as positional
  // args they're always provided — strip the `| undefined` they'd carry.
  const opt = (field: string): string =>
    `NonNullable<${className}Options['${field}']>`;
  const slotFields =
    shape.kind === 'slot'
      ? [shape.text, shape.object]
      : shape.content
      ? [shape.content]
      : [];
  const omit = [...INLINE_TRIO, ...slotFields.map((field) => field.name)]
    .map((key) => `'${key}'`)
    .join(' | ');
  const optionsType = `MethodOptions<Omit<${className}Options, ${omit}>>`;
  const ret = `Promise<ResultOf<${className}>>`;

  if (shape.kind === 'slot') {
    return emitSlotDual(method, shape, opt, optionsType, ret);
  }

  const c0 = shape.content;
  const contentTail = c0 ? `${c0.name}: ${opt(c0.name)}, ` : '';

  const chatSig = `${name}(chat_id: ${opt('chat_id')}, message_id: ${opt(
    'message_id',
  )}, ${contentTail}options?: ${optionsType}): ${ret};`;
  const inlineSig = `${name}(inline_message_id: ${opt(
    'inline_message_id',
  )}, ${contentTail}options?: ${optionsType}): ${ret};`;

  const secondType = c0
    ? `${opt('message_id')} | ${opt(c0.name)}`
    : `${opt('message_id')} | ${optionsType}`;
  const implParams = [
    `target: ${opt('chat_id')} | ${opt('inline_message_id')}`,
    `second${c0 ? '' : '?'}: ${secondType}`,
    ...(c0 ? [`c0OrOptions?: ${opt(c0.name)} | ${optionsType}`] : []),
    `chatOptions?: ${optionsType}`,
  ].join(', ');

  const chatField = c0 ? `${c0.name}: c0OrOptions as ${opt(c0.name)}, ` : '';
  const inlineField = c0 ? `${c0.name}: second, ` : '';
  const inlineOptionsSource = c0 ? 'c0OrOptions' : 'second';

  const impl = `${name}(${implParams}): ${ret} {
  // A numeric 2nd arg is message_id → the chat-based overload; otherwise inline.
  if (typeof second === 'number') {
    const { token, signal, ...rest } = chatOptions ?? {};
    return this.call(
      new ${className}({ chat_id: target, message_id: second, ${chatField}...rest }),
      { token, signal },
    );
  }
  const { token, signal, ...rest } = (${inlineOptionsSource} as ${optionsType}) ?? {};
  return this.call(
    new ${className}({ inline_message_id: target as ${opt(
    'inline_message_id',
  )}, ${inlineField}...rest }),
    { token, signal },
  );
}`;

  return `${jsdoc(method, [])}${chatSig}\n${inlineSig}\n${impl}`;
}

/**
 * Emit the forced-slot variant: the positional content slot is required and
 * accepts the string field OR the object alternative (mutually exclusive in
 * the spec — a call with neither is invalid, so no options-only overload).
 */
function emitSlotDual(
  method: IrMethod,
  shape: Extract<DualShape, { kind: 'slot' }>,
  opt: (field: string) => string,
  optionsType: string,
  ret: string,
): string {
  const { className, name } = method;
  const { text, object } = shape;

  const slotType = `${opt(text.name)} | ${opt(object.name)}`;
  const contentTail = `content: ${slotType}, `;

  const chatSig = `${name}(chat_id: ${opt('chat_id')}, message_id: ${opt(
    'message_id',
  )}, ${contentTail}options?: ${optionsType}): ${ret};`;
  const inlineSig = `${name}(inline_message_id: ${opt(
    'inline_message_id',
  )}, ${contentTail}options?: ${optionsType}): ${ret};`;

  const implParams = [
    `target: ${opt('chat_id')} | ${opt('inline_message_id')}`,
    `second: ${opt('message_id')} | ${slotType}`,
    `contentOrOptions?: ${slotType} | ${optionsType}`,
    `chatOptions?: ${optionsType}`,
  ].join(', ');

  // The slot fills text on a string, the object alternative otherwise.
  const slotComment = `a string fills ${text.name}, an object fills ${object.name}`;

  const impl = `${name}(${implParams}): ${ret} {
  // A numeric 2nd arg is message_id → the chat-based overload; otherwise inline.
  if (typeof second === 'number') {
    // The 3rd arg is the content slot: ${slotComment}.
    const { token, signal, ...rest } = chatOptions ?? {};
    return this.call(
      new ${className}({
        chat_id: target,
        message_id: second,
        ...(typeof contentOrOptions === 'string'
          ? { ${text.name}: contentOrOptions }
          : { ${object.name}: contentOrOptions as ${opt(object.name)} }),
        ...rest,
      }),
      { token, signal },
    );
  }
  // The 2nd arg is the content slot: ${slotComment}.
  const { token, signal, ...rest } =
    (contentOrOptions as ${optionsType} | undefined) ?? {};
  return this.call(
    new ${className}({
      inline_message_id: target as ${opt('inline_message_id')},
      ...(typeof second === 'string'
        ? { ${text.name}: second }
        : { ${object.name}: second }),
      ...rest,
    }),
    { token, signal },
  );
}`;

  return `${jsdoc(method, [])}${chatSig}\n${inlineSig}\n${impl}`;
}

const HEADER = `// GENERATED by tools/codegen — do not edit.
// Run \`npm run generate\` to refresh; \`npm run generate -- --check\` guards staleness.`;

function jsdoc(method: IrMethod, positional: IrField[]): string {
  const lines: string[] = [];
  const description = sanitize(method.description);
  if (description) {
    lines.push(
      ...description.split('\n').map((line) => ` * ${line}`.trimEnd()),
    );
  }
  for (const field of positional) {
    const fieldDescription = sanitize(field.description).replace(/\s+/g, ' ');
    lines.push(
      ` * @param ${field.name}${
        fieldDescription ? ` ${fieldDescription}` : ''
      }`,
    );
  }
  if (method.documentationLink) {
    lines.push(` * @see ${method.documentationLink}`);
  }
  return lines.length > 0 ? `/**\n${lines.join('\n')}\n */\n` : '';
}

// `callOptions`/`rest` are camelCase so they can't collide with a snake_case
// payload field named `options` (sendPoll) or `payload` (sendInvoice).

/** The trailing controls parameter — omits the positional fields, or is just CallOptions. */
function optionsParam(
  className: string,
  required: IrField[],
  optional: IrField[],
): string {
  if (optional.length === 0) {
    return 'callOptions?: CallOptions';
  }
  if (required.length === 0) {
    return `callOptions?: MethodOptions<${className}Options>`;
  }
  const omit = required.map((field) => `'${field.name}'`).join(' | ');
  return `callOptions?: MethodOptions<Omit<${className}Options, ${omit}>>`;
}

function emitMethod(method: IrMethod): string {
  const { className, name, args } = method;

  // Inline/chat dual methods (editMessageText, ...) get target-first overloads.
  const dual = inlineDualContent(method);
  if (dual) {
    return emitInlineDual(method, dual);
  }

  // No-arg methods (ApiMethod<null, R>): the whole arg IS the call controls.
  if (args.length === 0) {
    return `${jsdoc(method, [])}${name}(callOptions?: CallOptions) {
  return this.call(new ${className}(), callOptions);
}`;
  }

  const required = args.filter((arg) => !arg.optional);
  const optional = args.filter((arg) => arg.optional);
  const positional = required.map(
    (field) => `${field.name}: ${className}Options['${field.name}']`,
  );
  const params = [
    ...positional,
    optionsParam(className, required, optional),
  ].join(', ');
  // Positional fields seed the payload; the rest spreads over them.
  const payload =
    required.length === 0
      ? 'rest'
      : `{ ${required.map((field) => field.name).join(', ')}, ...rest }`;

  return `${jsdoc(method, required)}${name}(${params}) {
  const { token, signal, ...rest } = callOptions ?? {};
  return this.call(new ${className}(${payload}), { token, signal });
}`;
}

export function emitBotMethods(methods: IrMethod[]): string {
  const selected = methods.filter((method) => !isSkippedBotMethod(method.name));

  // A forced slot whose method left the spec would otherwise go silently
  // stale — every manifest entry must match an emitted method.
  const selectedNames = new Set(selected.map((method) => method.name));
  for (const forcedName of forcedPositionalMethodNames()) {
    if (!selectedNames.has(forcedName)) {
      throw new Error(
        `forced positional slot for ${forcedName} matches no emitted method — stale manifest entry?`,
      );
    }
  }

  const imports = new Set<string>();
  for (const method of selected) {
    imports.add(method.className);
    if (method.args.length > 0) {
      imports.add(`${method.className}Options`);
    }
  }
  const methodImports = [...imports]
    .sort()
    .map((name) => `  ${name},`)
    .join('\n');

  const body = selected.map(emitMethod).join('\n\n');

  return `${HEADER}
import { ApiMethod, type ResultOf } from './methods/api-method';
import type { CallOptions, MethodOptions } from './bot.service';
import {
${methodImports}
} from './methods';

/**
 * Generated \`bot.<method>(...)\` sugar — one wrapper per Bot API method without
 * bespoke BotService logic. Required arguments are positional, optional ones go
 * in a trailing \`callOptions\` object (which also carries \`token\`/\`signal\`).
 * BotService extends this and provides \`call\`; the command object is the layer beneath.
 */
export abstract class GeneratedBotMethods {
  protected abstract call<R>(
    method: ApiMethod<unknown, R>,
    options?: CallOptions,
  ): Promise<R>;

${body}
}
`;
}
