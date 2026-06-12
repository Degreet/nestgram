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
import { forcedPositionalContent, isSkippedBotMethod } from './manifest';
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

/**
 * If `method` is the inline/chat dual shape (the trio all optional) AND its
 * positional content disambiguates from a numeric `message_id` at runtime,
 * returns that content (0 or 1 field) — the signal to emit two ergonomic
 * overloads. Content is the required args plus any manifest-forced positional
 * field (optional in the spec, but kept positional for DX). Otherwise null
 * (the method is emitted as a normal options-only wrapper).
 */
function inlineDualContent(method: IrMethod): IrField[] | null {
  const forced = forcedPositionalContent(method.name);
  const byName = new Map(method.args.map((arg) => [arg.name, arg]));

  // A forced field is a public-signature promise — any way the spec could
  // silently break it must fail the generate run, not degrade the emit.
  for (const fieldName of forced) {
    const field = byName.get(fieldName);
    if (!field) {
      throw new Error(
        `${method.name}.${fieldName} is forced positional but the spec has no such arg`,
      );
    }
    // The runtime dispatch tells the field apart from the options bag (and
    // from a numeric message_id) via `typeof` — only a plain string is sound.
    if (!isPlainString(field.type)) {
      throw new Error(
        `${method.name}.${fieldName} is forced positional but not a plain string — the typeof dispatch can't tell it from the options bag`,
      );
    }
  }

  const trio = INLINE_TRIO.map((name) => byName.get(name));
  if (trio.some((field) => !field || !field.optional)) {
    if (forced.length > 0) {
      throw new Error(
        `${method.name} has forced positional content but lost the inline/chat dual shape`,
      );
    }
    return null;
  }
  const content = method.args.filter(
    (arg) => !arg.optional || forced.includes(arg.name),
  );
  // The `typeof second === 'number'` dispatch (number ⇒ message_id) is only safe
  // when the first content arg can't itself be a number, and the template only
  // handles up to one positional content arg.
  if (content.length > 1) {
    if (forced.length > 0) {
      throw new Error(
        `${method.name} has forced positional content but more than one positional slot — the template handles at most one`,
      );
    }
    return null;
  }
  if (content.length === 1 && couldBeNumber(content[0].type)) {
    return null;
  }
  return content;
}

/** Emit the inline/chat overload pair + the dispatching implementation. */
function emitInlineDual(method: IrMethod, content: IrField[]): string {
  const { className, name } = method;
  // NonNullable: the trio fields are optional in *Options, but as positional
  // args they're always provided — strip the `| undefined` they'd carry.
  const opt = (field: string): string =>
    `NonNullable<${className}Options['${field}']>`;
  const omit = [...INLINE_TRIO, ...content.map((field) => field.name)]
    .map((key) => `'${key}'`)
    .join(' | ');
  const optionsType = `MethodOptions<Omit<${className}Options, ${omit}>>`;
  const ret = `Promise<ResultOf<${className}>>`;
  const c0 = content[0];
  const contentTail = c0 ? `${c0.name}: ${opt(c0.name)}, ` : '';

  const chatSig = `${name}(chat_id: ${opt('chat_id')}, message_id: ${opt(
    'message_id',
  )}, ${contentTail}options?: ${optionsType}): ${ret};`;
  const inlineSig = `${name}(inline_message_id: ${opt(
    'inline_message_id',
  )}, ${contentTail}options?: ${optionsType}): ${ret};`;

  // A manifest-forced positional field is optional in the spec, so its slot
  // may be skipped entirely — add the options-only overload pair.
  const forcedC0 = c0?.optional === true;
  const optionsOnlySigs = forcedC0
    ? `\n${name}(chat_id: ${opt('chat_id')}, message_id: ${opt(
        'message_id',
      )}, options?: ${optionsType}): ${ret};\n${name}(inline_message_id: ${opt(
        'inline_message_id',
      )}, options?: ${optionsType}): ${ret};`
    : '';

  const secondType = c0
    ? forcedC0
      ? `${opt('message_id')} | ${opt(c0.name)} | ${optionsType}`
      : `${opt('message_id')} | ${opt(c0.name)}`
    : `${opt('message_id')} | ${optionsType}`;
  const implParams = [
    `target: ${opt('chat_id')} | ${opt('inline_message_id')}`,
    `second${c0 && !forcedC0 ? '' : '?'}: ${secondType}`,
    ...(c0 ? [`c0OrOptions?: ${opt(c0.name)} | ${optionsType}`] : []),
    `chatOptions?: ${optionsType}`,
  ].join(', ');

  const chatField = c0 ? `${c0.name}: c0OrOptions as ${opt(c0.name)}, ` : '';
  const inlineField = c0 ? `${c0.name}: second, ` : '';
  const inlineOptionsSource = c0 ? 'c0OrOptions' : 'second';

  const impl = forcedC0
    ? `${name}(${implParams}): ${ret} {
  // A numeric 2nd arg is message_id → the chat-based overload; otherwise inline.
  if (typeof second === 'number') {
    // A string 3rd arg fills the ${
      c0.name
    } slot; otherwise it's the options bag.
    const { token, signal, ...rest } =
      (typeof c0OrOptions === 'string' ? chatOptions : c0OrOptions) ?? {};
    return this.call(
      new ${className}({
        chat_id: target,
        message_id: second,
        ...(typeof c0OrOptions === 'string' ? { ${c0.name}: c0OrOptions } : {}),
        ...rest,
      }),
      { token, signal },
    );
  }
  // A string 2nd arg fills the ${c0.name} slot; otherwise it's the options bag.
  const { token, signal, ...rest } =
    (typeof second === 'string' ? (c0OrOptions as ${optionsType} | undefined) : second) ?? {};
  return this.call(
    new ${className}({
      inline_message_id: target as ${opt('inline_message_id')},
      ...(typeof second === 'string' ? { ${c0.name}: second } : {}),
      ...rest,
    }),
    { token, signal },
  );
}`
    : `${name}(${implParams}): ${ret} {
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

  return `${jsdoc(
    method,
    [],
  )}${chatSig}\n${inlineSig}${optionsOnlySigs}\n${impl}`;
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
