/**
 * Generator orchestrator. `npm run generate` runs the full emission (wired in a
 * later step); `--self-test` runs the resolver/IR assertion harness OUTSIDE
 * jest (jest's rootDir is `lib`, and the suite's baseline count must stay
 * stable), so the foundation is verifiable before any code is emitted.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import * as ts from 'typescript';
import { UpdateKind } from '../../lib/engine/context/update-kind';
import { emitMethodsBarrel } from './emit-barrel';
import { emitBotMethods } from './emit-bot-methods';
import { detectMedia, emitMethod } from './emit-methods';
import { emitSurfaceFile } from './emit-surface';
import { emitTypesFile } from './emit-types';
import { formatTs } from './format';
import { buildIr, Ir, IrType } from './ir';
import { HAND_OWNED_DECLARATIONS } from './manifest';
import { loadSpec } from './spec-loader';
import { GENERATED_SURFACE } from './surface.generated';
import { irTypeToTs } from './type-resolver';

/**
 * Human-anchored lower bounds. The snapshot equality below is tautological right
 * after a `generate` (both sides derive from the same IR), so it guards only
 * against a forgotten regenerate — not against a spec-loader/IR regression that
 * silently drops part of the surface. The Bot API only ever grows, so a count
 * under these floors means exactly such a regression. Bump upward only.
 */
const SURFACE_FLOOR_METHODS = 150;
const SURFACE_FLOOR_OBJECTS = 300;

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
    { kind: 'literalUnion', literals: ['a', 'b'], open: false },
    "'a' | 'b'",
    'literal union',
  );
  assertTs(
    { kind: 'literalUnion', literals: ['a', 'b'], open: true },
    "'a' | 'b' | (string & Record<never, never>)",
    'open literal union',
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
  // Catch a catastrophic shrink the self-consistent snapshot can't (see floors).
  assert(
    ir.methods.length >= SURFACE_FLOOR_METHODS,
    `surface shrank below floor: ${ir.methods.length} < ${SURFACE_FLOOR_METHODS} methods — likely a spec-loader/IR regression`,
  );
  assert(
    ir.objects.length >= SURFACE_FLOOR_OBJECTS,
    `surface shrank below floor: ${ir.objects.length} < ${SURFACE_FLOOR_OBJECTS} objects — likely a spec-loader/IR regression`,
  );
  // Baseline is the committed snapshot (surface.generated.ts), rewritten by a
  // full `generate`. A mismatch means the spec moved but the output wasn't
  // regenerated — the fix is `npm run generate`, never editing a number here.
  assert(
    ir.methods.length === GENERATED_SURFACE.methods,
    `surface drift: ${ir.methods.length} methods vs committed ${GENERATED_SURFACE.methods} — run \`npm run generate\``,
  );
  assert(
    ir.objects.length === GENERATED_SURFACE.objects,
    `surface drift: ${ir.objects.length} objects vs committed ${GENERATED_SURFACE.objects} — run \`npm run generate\``,
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

  // Abstract union (PaulSonOfLars `subtypes`) → an alias of references.
  const inputMedia = ir.objectsByName.get('InputMedia');
  assert(inputMedia?.kind === 'alias', 'InputMedia lowers to a union alias');

  // Multi-token field (`['Integer', 'String']`) → a union.
  const sendMessage2 = ir.methods.find((m) => m.name === 'sendMessage');
  const chatId = sendMessage2?.args.find((a) => a.name === 'chat_id');
  if (chatId) {
    assertTs(
      chatId.type,
      'number | string',
      'chat_id is a number|string union',
    );
  }

  // `maybe_multipart` is derived from an InputFile-typed field.
  const sendPhoto = ir.methods.find((m) => m.name === 'sendPhoto');
  assert(sendPhoto?.maybeMultipart === true, 'sendPhoto is multipart');
  assert(
    ir.methods.find((m) => m.name === 'getMe')?.maybeMultipart === false,
    'getMe is not multipart',
  );

  // Multipart classification (transitive): top-level file = flat, nested = attach.
  const mediaKind = (name: string): 'flat' | 'attach' | null => {
    const method = ir.methods.find((m) => m.name === name);
    return method ? detectMedia(method, ir.objectsByName) : null;
  };
  assert(mediaKind('sendPhoto') === 'flat', 'sendPhoto is flat multipart');
  assert(
    mediaKind('sendMediaGroup') === 'attach',
    'sendMediaGroup is attach multipart (nested InputMedia)',
  );
  assert(
    mediaKind('sendPaidMedia') === 'attach',
    'sendPaidMedia is attach multipart (transitively detected)',
  );
  assert(mediaKind('sendMessage') === null, 'sendMessage is not multipart');

  // Enum literal-union recovery (manifest CLOSED table): sendDice.emoji.
  const sendDice = ir.methods.find((m) => m.name === 'sendDice');
  const emoji = sendDice?.args.find((a) => a.name === 'emoji');
  if (emoji) {
    assertTs(
      emoji.type,
      "'🎲' | '🎯' | '🏀' | '⚽' | '🎳' | '🎰'",
      'sendDice.emoji enum union',
    );
  }
  // Open-enum recovery (manifest OPEN table): BotSubscriptionUpdated.state —
  // reads the real IR so a miscategorisation into the CLOSED table is caught
  // here, not only by the staleness guard.
  const subscription = ir.objectsByName.get('BotSubscriptionUpdated');
  if (subscription?.kind === 'interface') {
    const state = subscription.fields.find((f) => f.name === 'state');
    if (state) {
      assertTs(
        state.type,
        "'canceled' | 'active' | 'failed' | (string & Record<never, never>)",
        'BotSubscriptionUpdated.state open enum union',
      );
    }
  }
  // Named-type promotion (manifest table): parse_mode → the hand-owned enum type.
  const parseMode = sendMessage?.args.find((a) => a.name === 'parse_mode');
  if (parseMode) {
    assertTs(
      parseMode.type,
      'ParseModeValue',
      'parse_mode named type (owner-agnostic)',
    );
  }

  // Discriminator recovery (description prose): a subtype member's tag literal.
  const owner = ir.objectsByName.get('ChatMemberOwner');
  if (owner?.kind === 'interface') {
    const status = owner.fields.find((f) => f.name === 'status');
    assert(status !== undefined, 'ChatMemberOwner.status present');
    if (status) {
      assertTs(
        status.type,
        "'creator'",
        'ChatMemberOwner.status discriminator',
      );
    }
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
const CANONICAL_BOT_METHODS_FILE = 'lib/api/generated-bot-methods.ts';
const CANONICAL_SURFACE_FILE = 'tools/codegen/surface.generated.ts';

/** Builds the generated BotService sugar (the abstract base it extends). */
function buildBotMethodsFile(outFile: string): Map<string, string> {
  const absolute = resolve(process.cwd(), outFile);
  const source = emitBotMethods(buildIr(loadSpec()).methods);
  return new Map([[absolute, formatTs(source, absolute)]]);
}

/** Builds the surface snapshot (the self-test baseline counts). */
function buildSurfaceFile(outFile: string): Map<string, string> {
  const absolute = resolve(process.cwd(), outFile);
  const source = emitSurfaceFile(buildIr(loadSpec()));
  return new Map([[absolute, formatTs(source, absolute)]]);
}

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
    if (
      method.maybeMultipart &&
      detectMedia(method, ir.objectsByName) === null
    ) {
      process.stderr.write(
        `warning: ${method.name} is maybe_multipart but no file field was detected\n`,
      );
    }
    const path = join(absoluteOut, `${method.fileName}.ts`);
    files.set(
      path,
      formatTs(
        emitMethod(method, {
          apiMethodImport,
          objectsByName: ir.objectsByName,
        }),
        path,
      ),
    );
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

/** The property names declared by `interface <name>` in a hand-written file. */
function declaredFieldNames(file: string, name: string): Set<string> | null {
  const path = resolve(process.cwd(), file);
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  for (const statement of source.statements) {
    if (ts.isInterfaceDeclaration(statement) && statement.name.text === name) {
      const names = statement.members
        .filter(ts.isPropertySignature)
        .map((member) =>
          ts.isIdentifier(member.name) ? member.name.text : null,
        )
        .filter((field): field is string => field !== null);
      return new Set(names);
    }
  }
  return null;
}

/**
 * Reports hand-owned declarations whose fields have drifted from the spec.
 *
 * `SKIP_OBJECTS` keeps these out of the emitter, so {@link checkFiles} — which
 * only diffs emitted output — is blind to them: a field added to `User` or
 * `InputMediaVideo` upstream just goes missing, and no guard fires. This reads
 * each hand-written file and compares its field NAMES to the spec's.
 *
 * Names, not types, on purpose: these files exist precisely to widen types the
 * generator can't (`media: string | InputFile`), so comparing types would fight
 * the seam. A field that exists but is mistyped is a different, visible problem.
 */
function handOwnedDrift(ir: Ir): string[] {
  const problems: string[] = [];
  for (const [name, file] of HAND_OWNED_DECLARATIONS) {
    const object = ir.objectsByName.get(name);
    // Opaque sentinels (`InputFile`) have no spec fields to track.
    if (object?.kind !== 'interface') {
      continue;
    }
    const declared = declaredFieldNames(file, name);
    if (!declared) {
      problems.push(
        `${file}: no \`interface ${name}\` found (it is hand-owned)`,
      );
      continue;
    }
    const spec = new Set(object.fields.map((field) => field.name));
    const missing = [...spec].filter((field) => !declared.has(field));
    const extra = [...declared].filter((field) => !spec.has(field));
    if (missing.length > 0) {
      problems.push(
        `${file}: ${name} is missing spec field(s): ${missing.join(', ')}`,
      );
    }
    if (extra.length > 0) {
      problems.push(
        `${file}: ${name} declares field(s) the spec doesn't have: ${extra.join(
          ', ',
        )}`,
      );
    }
  }
  return problems;
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
  const botMethodsOut = parseFlagValue('--bot-methods-out');
  if (botMethodsOut !== undefined) {
    writeFiles(buildBotMethodsFile(botMethodsOut));
    return;
  }
  const surfaceOut = parseFlagValue('--surface-out');
  if (surfaceOut !== undefined) {
    writeFiles(buildSurfaceFile(surfaceOut));
    return;
  }

  // Default: full canonical generation, or `--check` freshness guard.
  const files = new Map([
    ...buildMethodFiles(CANONICAL_METHODS_DIR),
    ...buildTypeFile(CANONICAL_TYPES_FILE),
    ...buildBotMethodsFile(CANONICAL_BOT_METHODS_FILE),
    ...buildSurfaceFile(CANONICAL_SURFACE_FILE),
  ]);
  const drift = handOwnedDrift(buildIr(loadSpec()));
  if (process.argv.includes('--check')) {
    if (drift.length > 0) {
      process.stderr.write(
        `Hand-owned declarations have drifted from the spec — edit them by hand ` +
          `(regenerating will not fix these):\n${drift
            .map((problem) => `  ${problem}`)
            .join('\n')}\n`,
      );
      process.exitCode = 1;
      return;
    }
    checkFiles(files);
    return;
  }
  // A warning, not a throw: the fix lives in a hand-written file, so drift must
  // never block re-emitting everything else.
  for (const problem of drift) {
    process.stderr.write(`warning: ${problem}\n`);
  }
  writeFiles(files);
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
