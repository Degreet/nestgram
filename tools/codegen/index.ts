/**
 * Generator orchestrator. `npm run generate` runs the full emission (wired in a
 * later step); `--self-test` runs the resolver/IR assertion harness OUTSIDE
 * jest (jest's rootDir is `lib`, and the suite's baseline count must stay
 * stable), so the foundation is verifiable before any code is emitted.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { UpdateKind } from '../../lib/engine/context/update-kind';
import { emitMethodsBarrel } from './emit-barrel';
import { detectMedia, emitMethod } from './emit-methods';
import { emitTypesFile } from './emit-types';
import { formatTs } from './format';
import { buildIr, IrType } from './ir';
import { loadSpec } from './spec-loader';
import { irTypeToTs } from './type-resolver';

const EXPECTED_METHODS = 135;
const EXPECTED_OBJECTS = 232;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`self-test failed: ${message}`);
  }
}

function assertTs(type: IrType, expected: string, label: string): void {
  const actual = irTypeToTs(type);
  if (actual !== expected) {
    throw new Error(
      `self-test failed: ${label} — expected \`${expected}\`, got \`${actual}\``,
    );
  }
}

function selfTest(): void {
  // Resolver: the load-bearing type spellings.
  assertTs({ kind: 'primitive', ts: 'number' }, 'number', 'primitive');
  assertTs(
    { kind: 'literalUnion', literals: ['a', 'b'] },
    "'a' | 'b'",
    'literal union',
  );
  assertTs(
    { kind: 'reference', name: 'Chat' },
    'RawChat',
    'reference is Raw-prefixed',
  );
  assertTs({ kind: 'reference', name: 'User' }, 'User', 'reference stays bare');
  assertTs(
    { kind: 'array', element: { kind: 'reference', name: 'PhotoSize' } },
    'RawPhotoSize[]',
    'array of reference',
  );
  assertTs(
    {
      kind: 'array',
      element: {
        kind: 'union',
        variants: [
          { kind: 'primitive', ts: 'number' },
          { kind: 'primitive', ts: 'string' },
        ],
      },
    },
    '(number | string)[]',
    'array of union is parenthesised',
  );

  const ir = buildIr(loadSpec());
  assert(
    ir.methods.length === EXPECTED_METHODS,
    `expected ${EXPECTED_METHODS} methods, got ${ir.methods.length}`,
  );
  assert(
    ir.objects.length === EXPECTED_OBJECTS,
    `expected ${EXPECTED_OBJECTS} objects, got ${ir.objects.length}`,
  );

  // Engine invariant: every UpdateKind value must be a field of the spec Update.
  const update = ir.objectsByName.get('Update');
  assert(
    update !== undefined && update.kind === 'interface',
    'Update is an interface',
  );
  const updateFields = new Set(
    update !== undefined && update.kind === 'interface'
      ? update.fields.map((f) => f.name)
      : [],
  );
  for (const kind of Object.values(UpdateKind)) {
    assert(
      updateFields.has(kind),
      `generated Update is missing UpdateKind field '${kind}'`,
    );
  }

  // Naming: method → class → file.
  const sendMessage = ir.methods.find((m) => m.name === 'sendMessage');
  assert(sendMessage !== undefined, 'sendMessage present');
  assert(sendMessage?.className === 'SendMessage', 'sendMessage class name');
  assert(sendMessage?.fileName === 'send-message', 'sendMessage file name');
  const answerCallback = ir.methods.find(
    (m) => m.name === 'answerCallbackQuery',
  );
  assert(
    answerCallback?.fileName === 'answer-callback-query',
    'answerCallbackQuery file name',
  );

  // Discriminator default (object property) → literal.
  const inputMediaPhoto = ir.objectsByName.get('InputMediaPhoto');
  assert(
    inputMediaPhoto?.kind === 'interface',
    'InputMediaPhoto is an interface',
  );
  if (inputMediaPhoto?.kind === 'interface') {
    const typeField = inputMediaPhoto.fields.find((f) => f.name === 'type');
    assert(typeField !== undefined, 'InputMediaPhoto.type present');
    if (typeField) {
      assertTs(
        typeField.type,
        "'photo'",
        'InputMediaPhoto.type discriminator literal',
      );
    }
  }

  // Bool default:true (object property) → `true` literal.
  const user = ir.objectsByName.get('User');
  if (user?.kind === 'interface') {
    const isPremium = user.fields.find((f) => f.name === 'is_premium');
    if (isPremium) {
      assertTs(isPremium.type, 'true', 'User.is_premium bool-default literal');
    }
  }

  // Method-arg defaults are NOT literals (the API default value, not a type).
  const getUpdates = ir.methods.find((m) => m.name === 'getUpdates');
  const limit = getUpdates?.args.find((a) => a.name === 'limit');
  if (limit) {
    assertTs(limit.type, 'number', 'getUpdates.limit arg-default stays number');
  }
  // Enumeration is a genuine constraint → a literal union even for an argument
  // (and the `default` within it does not collapse it to a single literal).
  const sendDice = ir.methods.find((m) => m.name === 'sendDice');
  const emoji = sendDice?.args.find((a) => a.name === 'emoji');
  if (emoji) {
    assertTs(
      emoji.type,
      "'🎲' | '🎯' | '🏀' | '⚽' | '🎳' | '🎰'",
      'sendDice.emoji enum union',
    );
  }

  process.stdout.write(
    `self-test OK — ${ir.objects.length} objects, ${ir.methods.length} methods\n`,
  );
}

function parseFlagValue(name: string): string | undefined {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

const CANONICAL_METHODS_DIR = 'lib/api/methods';
const CANONICAL_TYPES_FILE = 'lib/events/raw-update.types.ts';

/** Builds the method-class files (+ barrel on a full run) as path → formatted source. */
function buildMethodFiles(
  outDir: string,
  only?: string[],
): Map<string, string> {
  const ir = buildIr(loadSpec());
  const absoluteOut = resolve(process.cwd(), outDir);
  const apiMethodImport =
    basename(absoluteOut) === 'methods'
      ? './api-method'
      : '../methods/api-method';

  const selected = only
    ? ir.methods.filter((method) => only.includes(method.name))
    : ir.methods;
  const files = new Map<string, string>();
  for (const method of selected) {
    if (method.maybeMultipart && detectMedia(method) === null) {
      process.stderr.write(
        `warning: ${method.name} is maybe_multipart but no file field was detected\n`,
      );
    }
    const path = join(absoluteOut, `${method.fileName}.ts`);
    files.set(path, formatTs(emitMethod(method, { apiMethodImport }), path));
  }
  // The barrel is only rewritten on a full emission — a filtered dry run must
  // not clobber it with a subset.
  if (!only) {
    const barrelPath = join(absoluteOut, 'index.ts');
    files.set(barrelPath, formatTs(emitMethodsBarrel(ir.methods), barrelPath));
  }
  return files;
}

/** Builds the single raw-types file as path → formatted source. */
function buildTypeFile(outFile: string): Map<string, string> {
  const absolute = resolve(process.cwd(), outFile);
  return new Map([
    [absolute, formatTs(emitTypesFile(buildIr(loadSpec())), absolute)],
  ]);
}

function writeFiles(files: Map<string, string>): void {
  for (const [path, content] of files) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  process.stdout.write(`Wrote ${files.size} file(s).\n`);
}

/** Fails (exit 1) if any committed file differs from a fresh generation. */
function checkFiles(files: Map<string, string>): void {
  const stale: string[] = [];
  for (const [path, content] of files) {
    const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (current !== content) {
      stale.push(path);
    }
  }
  if (stale.length > 0) {
    process.stderr.write(
      `Generated output is stale — run \`npm run generate\`:\n${stale
        .map((path) => `  ${path}`)
        .join('\n')}\n`,
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `Generated output is up to date (${files.size} files).\n`,
  );
}

function main(): void {
  if (process.argv.includes('--self-test')) {
    selfTest();
    return;
  }
  const only = parseFlagValue('--only')
    ?.split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  // Targeted dry runs (used during development / review).
  const methodsOut = parseFlagValue('--methods-out');
  if (methodsOut !== undefined) {
    writeFiles(buildMethodFiles(methodsOut, only));
    return;
  }
  const typesOut = parseFlagValue('--types-out');
  if (typesOut !== undefined) {
    writeFiles(buildTypeFile(typesOut));
    return;
  }

  // Default: full canonical generation, or `--check` freshness guard.
  const files = new Map([
    ...buildMethodFiles(CANONICAL_METHODS_DIR),
    ...buildTypeFile(CANONICAL_TYPES_FILE),
  ]);
  if (process.argv.includes('--check')) {
    checkFiles(files);
  } else {
    writeFiles(files);
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
