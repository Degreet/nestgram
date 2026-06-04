/**
 * Emits the whole `raw-update.types.ts` file: one declaration per spec object —
 * `export interface Raw<Name>` (properties), `export type Raw<Name> = … | …`
 * (any_of unions), or `export type Raw<Name> = Record<string, never>` (opaque
 * placeholders). The bare hand-written names (User, InputFile, InputMedia*) are
 * skipped and imported instead.
 *
 * Output is unformatted; the orchestrator runs it through the project Prettier.
 */
import { collectReferences, Ir, IrObject } from './ir';
import { isInputMediaName, resolveReference, SKIP_OBJECTS } from './manifest';
import { irTypeToTs } from './type-resolver';

const HEADER = `/**
 * Raw Telegram Bot API wire types — GENERATED from the vendored ark0f spec by
 * \`npm run generate\`. Do not edit by hand. These are the wire shapes the engine
 * wraps into the rich event classes in lib/events; the bare names (User,
 * InputFile, InputMedia*) are hand-written and imported below.
 */`;

function emitObject(object: IrObject): string {
  const name = resolveReference(object.name);
  switch (object.kind) {
    case 'interface': {
      // Wire (inbound) types keep the literal spec shape — the reply_markup
      // builder widening is an OUTPUT-side concern, applied only in method
      // options (emit-methods), never on a type the engine merely reads.
      const fields = object.fields
        .map(
          (field) =>
            `  ${field.name}${field.optional ? '?' : ''}: ${irTypeToTs(
              field.type,
            )};`,
        )
        .join('\n');
      return `export interface ${name} {\n${fields}\n}`;
    }
    case 'alias':
      return `export type ${name} = ${irTypeToTs(object.type)};`;
    case 'opaque':
      return `export type ${name} = Record<string, never>;`;
  }
}

function buildImports(objects: IrObject[]): string {
  const refs = new Set<string>();
  for (const object of objects) {
    if (object.kind === 'interface') {
      object.fields.forEach((field) => collectReferences(field.type, refs));
    } else if (object.kind === 'alias') {
      collectReferences(object.type, refs);
    }
  }

  let needsUser = false;
  let needsInputFile = false;
  const inputMedia = new Set<string>();
  for (const ref of refs) {
    const ts = resolveReference(ref);
    if (ts === 'User') {
      needsUser = true;
    } else if (ts === 'InputFile') {
      needsInputFile = true;
    } else if (isInputMediaName(ts)) {
      inputMedia.add(ts);
    }
  }

  const lines: string[] = [];
  if (needsUser) {
    lines.push(`import { User } from './user';`);
  }
  if (needsInputFile) {
    lines.push(`import { InputFile } from '../api/input-file';`);
  }
  if (inputMedia.size > 0) {
    lines.push(
      `import { ${[...inputMedia]
        .sort()
        .join(', ')} } from '../api/input-media';`,
    );
  }
  return lines.join('\n');
}

export function emitTypesFile(ir: Ir): string {
  const objects = ir.objects.filter((object) => !SKIP_OBJECTS.has(object.name));
  const sorted = [...objects].sort((a, b) => a.name.localeCompare(b.name));
  const imports = buildImports(objects);
  const declarations = sorted.map(emitObject).join('\n\n');
  return `${HEADER}\n${imports ? `${imports}\n` : ''}\n${declarations}\n`;
}
