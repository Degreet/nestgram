/**
 * Hand-owned overrides — the permanent manual seam between generated code and
 * the framework's ergonomic layer. The generator consults this for:
 *
 * 1. Which spec objects are NOT emitted as `Raw*` wire types because a
 *    hand-written class already owns the bare name (`User`, `InputFile`,
 *    `InputMedia*`), and how a `reference` to them resolves.
 * 2. (step 4) Per-method `wrap()` bodies + rich return types that build
 *    `Message`/`CallbackQuery` events — spliced in so regenerating a file never
 *    clobbers the hand-authored ergonomic glue.
 */

const RAW_PREFIX = 'Raw';

/**
 * Spec object names that resolve to an existing hand-written declaration
 * instead of a generated `Raw*` interface. `InputFile` is the multipart
 * sentinel (`lib/api/input-file.ts`); `InputMedia*` are hand-written
 * (`lib/api/input-media.ts`); `User` stays bare (`lib/events/user.ts`).
 */
const BARE_REFERENCES = new Set<string>([
  'User',
  'InputFile',
  'InputMediaAudio',
  'InputMediaDocument',
  'InputMediaPhoto',
  'InputMediaVideo',
  'InputMediaAnimation',
]);

/** Objects the type emitter must NOT emit (a hand-written declaration owns them). */
export const SKIP_OBJECTS: ReadonlySet<string> = BARE_REFERENCES;

/** Resolve a spec object reference to its TS type name (`Chat` → `RawChat`). */
export function resolveReference(name: string): string {
  return BARE_REFERENCES.has(name) ? name : `${RAW_PREFIX}${name}`;
}
