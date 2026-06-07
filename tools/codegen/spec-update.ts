/**
 * Re-downloads the vendored Telegram Bot API spec and rewrites the pinned copy
 * plus its provenance files.
 *
 * Source: PaulSonOfLars/telegram-bot-api-spec — a community machine-readable
 * spec that re-scrapes `core.telegram.org/bots/api` DAILY (the previous source,
 * ark0f, went stale at Bot API 8.3 / Nov 2024). The published file is mutable —
 * it redeploys on every upstream scrape — so the spec is VENDORED, never fetched
 * at generate time. Run this manually to bump it; the result is a reviewable
 * diff. `npm run spec:update`.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SPEC_URL =
  'https://raw.githubusercontent.com/PaulSonOfLars/telegram-bot-api-spec/main/api.min.json';

const SPEC_DIR = join(__dirname, 'spec');
const SPEC_FILE = join(SPEC_DIR, 'api.min.json');
const HASH_FILE = join(SPEC_DIR, 'hash.txt');
const VERSION_FILE = join(SPEC_DIR, 'spec-version.json');

interface SpecHeader {
  version: string;
  release_date: string;
  methods: Record<string, unknown>;
  types: Record<string, unknown>;
}

async function updateSpec(): Promise<void> {
  process.stdout.write(`Downloading ${SPEC_URL} …\n`);
  const response = await fetch(SPEC_URL);
  if (!response.ok) {
    throw new Error(`Spec download failed: HTTP ${response.status}`);
  }

  const raw = await response.text();
  const spec = JSON.parse(raw) as SpecHeader;
  const methods = Object.keys(spec.methods).length;
  const objects = Object.keys(spec.types).length;
  const sha1 = createHash('sha1').update(raw).digest('hex');

  mkdirSync(SPEC_DIR, { recursive: true });
  writeFileSync(SPEC_FILE, raw);
  writeFileSync(HASH_FILE, `${sha1}\n`);
  writeFileSync(
    VERSION_FILE,
    `${JSON.stringify(
      {
        botApiVersion: spec.version,
        releaseDate: spec.release_date,
        methods,
        objects,
        source: SPEC_URL,
        sha1,
      },
      null,
      2,
    )}\n`,
  );

  process.stdout.write(
    `Vendored ${spec.version} (${spec.release_date}) — ` +
      `${methods} methods, ${objects} objects, ` +
      `${raw.length} bytes, sha1 ${sha1}\n`,
  );
}

updateSpec().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
