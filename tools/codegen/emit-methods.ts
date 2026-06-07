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
import { collectReferences, IrMethod, IrObject, IrType } from './ir';
import {
  applyFieldTypeOverride,
  getMethodOverride,
  isInputMediaName,
  MethodOverride,
  resolveReference,
} from './manifest';
import { irTypeToTs } from './type-resolver';

const INPUT_FILE = 'InputFile';

export interface MethodEmitConfig {
  /** Import specifier for the hand-written ApiMethod base, relative to output. */
  apiMethodImport: string;
  /** Every IR object by name — for transitive multipart detection. */
  objectsByName: Map<string, IrObject>;
}

/**
 * How a method carries files, or `null` for none:
 * - `flat`  — an `InputFile` sits directly on an argument; appended as its own
 *   part (`createInlineData`).
 * - `attach` — files live inside referenced objects; serialized recursively as
 *   `attach://` references (`createAttachedData`).
 */
type MediaKind = 'flat' | 'attach';

/** Does the type itself resolve to `InputFile` (through unions/arrays only)? */
function hasTopLevelInputFile(type: IrType): boolean {
  switch (type.kind) {
    case 'reference':
      return type.name === INPUT_FILE;
    case 'array':
      return hasTopLevelInputFile(type.element);
    case 'union':
      return type.variants.some(hasTopLevelInputFile);
    default:
      return false;
  }
}

/** Is an `InputFile` reachable anywhere, descending into referenced objects? */
function reachesInputFile(
  type: IrType,
  objects: Map<string, IrObject>,
  seen: Set<string>,
): boolean {
  switch (type.kind) {
    case 'reference': {
      if (type.name === INPUT_FILE) {
        return true;
      }
      if (seen.has(type.name)) {
        return false;
      }
      seen.add(type.name);
      const object = objects.get(type.name);
      if (object?.kind === 'interface') {
        return object.fields.some((f) =>
          reachesInputFile(f.type, objects, seen),
        );
      }
      if (object?.kind === 'alias') {
        return reachesInputFile(object.type, objects, seen);
      }
      return false;
    }
    case 'array':
      return reachesInputFile(type.element, objects, seen);
    case 'union':
      return type.variants.some((v) => reachesInputFile(v, objects, seen));
    default:
      return false;
  }
}

/**
 * Derives multipart handling by reachability, not a hand-list: a top-level
 * `InputFile` argument is `flat`; an `InputFile` reachable only inside a
 * referenced object is `attach`. The actual file collection is fully recursive
 * (see `form-data.ts`), so this only picks the body format.
 */
export function detectMedia(
  method: IrMethod,
  objects: Map<string, IrObject>,
): MediaKind | null {
  if (method.args.some((arg) => hasTopLevelInputFile(arg.type))) {
    return 'flat';
  }
  if (
    method.args.some((arg) => reachesInputFile(arg.type, objects, new Set()))
  ) {
    return 'attach';
  }
  return null;
}

function buildImports(
  method: IrMethod,
  config: MethodEmitConfig,
  media: MediaKind | null,
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

  const lines: string[] = [
    `import { ApiMethod } from '${config.apiMethodImport}';`,
  ];
  if (override) {
    lines.push(`import { Message } from '../../events';`);
    lines.push(`import type { BotService } from '../bot.service';`);
  }
  if (media !== null) {
    lines.push(`import { hasInputFile } from '../form-data';`);
  }
  if (needsInputFileType) {
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
        `  ${arg.name}${arg.optional ? '?' : ''}: ${applyFieldTypeOverride(
          arg.name,
          irTypeToTs(arg.type),
        )};`,
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

/**
 * One getter for every multipart method: a recursive scan that mirrors the file
 * collection, so it is true exactly when the call carries a file — regardless of
 * which (possibly nested) field holds it.
 */
function emitHasMedia(): string {
  return `get hasMedia(): boolean {\n  return hasInputFile(this.payload);\n}`;
}

function emitClass(
  method: IrMethod,
  media: MediaKind | null,
  override?: MethodOverride,
): string {
  const hasArgs = method.args.length > 0;
  const optionsType = hasArgs ? `${method.className}Options` : 'null';
  const returnType = returnTypeFor(method, override);

  const members: string[] = [`readonly method = '${method.name}';`];
  if (media === 'attach') {
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
    members.push(emitHasMedia());
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
  const media = detectMedia(method, config.objectsByName);
  const parts = [
    buildImports(method, config, media, override),
    emitOptions(method),
    emitClass(method, media, override),
  ].filter((part) => part.length > 0);
  return `${parts.join('\n\n')}\n`;
}
