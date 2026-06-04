/**
 * Emits a command-object class per Bot API method, shaped exactly like the
 * hand-written ones: `extends ApiMethod<TOptions, TResult>`, a `readonly method`
 * field, an exported `<Class>Options` interface, a ctor delegating to `super`,
 * and — for multipart methods — the `hasMedia`/`isAttachMedia` transport signals
 * derived from the spec. Rich `wrap()` bodies are spliced from the manifest.
 *
 * Output is unformatted; the orchestrator runs it through the project's
 * Prettier so committed files match lint-staged.
 */
import { IrMethod, IrType } from './ir';
import {
  getMethodOverride,
  isInputMediaName,
  MethodOverride,
  resolveReference,
} from './manifest';
import { irTypeToTs } from './type-resolver';

export interface MethodEmitConfig {
  /** Import specifier for the hand-written ApiMethod base, relative to output. */
  apiMethodImport: string;
}

type MediaConfig =
  | { kind: 'flat'; fields: string[] }
  | { kind: 'nested'; field: string };

function collectReferences(type: IrType, into: Set<string>): void {
  switch (type.kind) {
    case 'reference':
      into.add(type.name);
      return;
    case 'array':
      collectReferences(type.element, into);
      return;
    case 'union':
      type.variants.forEach((variant) => collectReferences(variant, into));
      return;
    default:
      return;
  }
}

function references(type: IrType): Set<string> {
  const names = new Set<string>();
  collectReferences(type, names);
  return names;
}

function isInputMediaFamily(name: string): boolean {
  return name.startsWith('InputMedia') || name.startsWith('InputPaidMedia');
}

/**
 * Derives multipart handling from the spec: a flat file field is an argument
 * whose type references `InputFile`; a nested field is an array of `InputMedia*`
 * (the files live inside each element's `media`). Returns null for non-file
 * methods. Callers should warn if a `maybe_multipart` method yields null.
 */
export function detectMedia(method: IrMethod): MediaConfig | null {
  const flat: string[] = [];
  for (const arg of method.args) {
    if (arg.type.kind === 'array') {
      if ([...references(arg.type.element)].some(isInputMediaFamily)) {
        return { kind: 'nested', field: arg.name };
      }
    } else if (references(arg.type).has('InputFile')) {
      flat.push(arg.name);
    }
  }
  return flat.length > 0 ? { kind: 'flat', fields: flat } : null;
}

function buildImports(
  method: IrMethod,
  config: MethodEmitConfig,
  media: MediaConfig | null,
  override?: MethodOverride,
): string {
  const refs = new Set<string>();
  method.args.forEach((arg) => collectReferences(arg.type, refs));
  if (!override) {
    collectReferences(method.returnType, refs);
  }

  const rawTypes = new Set<string>();
  const inputMediaTypes = new Set<string>();
  let needsUser = false;
  let needsInputFileType = false;
  for (const name of refs) {
    const ts = resolveReference(name);
    if (ts === 'User') {
      needsUser = true;
    } else if (ts === 'InputFile') {
      needsInputFileType = true;
    } else if (isInputMediaName(ts)) {
      inputMediaTypes.add(ts);
    } else {
      rawTypes.add(ts);
    }
  }

  const inputFileAsValue = media !== null;
  const lines: string[] = [
    `import { ApiMethod } from '${config.apiMethodImport}';`,
  ];
  if (override) {
    lines.push(`import { Message } from '../../events';`);
    lines.push(`import type { BotService } from '../bot.service';`);
  }
  if (inputFileAsValue) {
    lines.push(`import { InputFile } from '../input-file';`);
  } else if (needsInputFileType) {
    lines.push(`import type { InputFile } from '../input-file';`);
  }
  if (inputMediaTypes.size > 0) {
    lines.push(
      `import type { ${[...inputMediaTypes]
        .sort()
        .join(', ')} } from '../input-media';`,
    );
  }
  if (rawTypes.size > 0) {
    lines.push(
      `import type { ${[...rawTypes]
        .sort()
        .join(', ')} } from '../../events/raw-update.types';`,
    );
  }
  if (needsUser) {
    lines.push(`import type { User } from '../../events/user';`);
  }
  return lines.join('\n');
}

function emitOptions(method: IrMethod): string {
  if (method.args.length === 0) {
    return '';
  }
  const fields = method.args
    .map(
      (arg) =>
        `  ${arg.name}${arg.optional ? '?' : ''}: ${irTypeToTs(arg.type)};`,
    )
    .join('\n');
  return `export interface ${method.className}Options {\n${fields}\n}`;
}

function returnTypeFor(method: IrMethod, override?: MethodOverride): string {
  if (override) {
    return override.returnType;
  }
  // A bool return is Telegram's literal `True` on success.
  if (
    method.returnType.kind === 'primitive' &&
    method.returnType.ts === 'boolean'
  ) {
    return 'true';
  }
  return irTypeToTs(method.returnType);
}

function emitHasMedia(media: MediaConfig): string {
  if (media.kind === 'flat') {
    const checks = media.fields
      .map((field) => `this.payload?.${field} instanceof InputFile`)
      .join(' || ');
    return `get hasMedia(): boolean {\n  return ${checks};\n}`;
  }
  return `get hasMedia(): boolean {\n  return (\n    this.payload?.${media.field}.some((media) => media.media instanceof InputFile) ?? false\n  );\n}`;
}

function emitClass(
  method: IrMethod,
  media: MediaConfig | null,
  override?: MethodOverride,
): string {
  const hasArgs = method.args.length > 0;
  const optionsType = hasArgs ? `${method.className}Options` : 'null';
  const returnType = returnTypeFor(method, override);

  const members: string[] = [`readonly method = '${method.name}';`];
  if (media?.kind === 'nested') {
    members.push('readonly isAttachMedia = true;');
  }
  if (!hasArgs) {
    members.push('constructor() {\n  super(null);\n}');
  } else if (method.args.some((arg) => !arg.optional)) {
    members.push(
      `constructor(payload: ${optionsType}) {\n  super(payload);\n}`,
    );
  } else {
    members.push(
      `constructor(payload?: ${optionsType}) {\n  super(payload);\n}`,
    );
  }
  if (media) {
    members.push(emitHasMedia(media));
  }
  if (override) {
    members.push(override.wrap);
  }

  return `export class ${
    method.className
  } extends ApiMethod<${optionsType}, ${returnType}> {\n  ${members.join(
    '\n\n  ',
  )}\n}`;
}

export function emitMethod(method: IrMethod, config: MethodEmitConfig): string {
  const override = getMethodOverride(method.name);
  const media = detectMedia(method);
  const parts = [
    buildImports(method, config, media, override),
    emitOptions(method),
    emitClass(method, media, override),
  ].filter((part) => part.length > 0);
  return `${parts.join('\n\n')}\n`;
}
