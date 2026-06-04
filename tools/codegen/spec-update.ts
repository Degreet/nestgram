/**
 * Re-downloads the vendored Telegram Bot API spec (ark0f/tg-bot-api,
 * `custom_v2` flavour) and rewrites the pinned copy plus its provenance files.
 *
 * The published URL is mutable — it redeploys on every upstream commit — so the
 * spec is VENDORED, never fetched at generate time. Run this manually to bump
 * it; the result is a reviewable diff. `npm run spec:update`.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SPEC_URL = 'https://ark0f.github.io/tg-bot-api/custom_v2.min.json';

const SPEC_DIR = join(__dirname, 'spec');
const SPEC_FILE = join(SPEC_DIR, 'custom_v2.min.json');
const HASH_FILE = join(SPEC_DIR, 'hash.txt');
const VERSION_FILE = join(SPEC_DIR, 'spec-version.json');

interface BotApiVersion {
  major: number;
  minor: number;
  patch: number;
}

interface RecentChanges {
  year: number;
  month: number;
  day: number;
}

interface SpecHeader {
  version: BotApiVersion;
  recent_changes: RecentChanges;
  methods: unknown[];
  objects: unknown[];
}

async function updateSpec(): Promise<void> {
  process.stdout.write(`Downloading ${SPEC_URL} …\n`);
  const response = await fetch(SPEC_URL);
  if (!response.ok) {
    throw new Error(`Spec download failed: HTTP ${response.status}`);
  }

  const raw = await response.text();
  const spec = JSON.parse(raw) as SpecHeader;
  const { major, minor, patch } = spec.version;
  const sha1 = createHash('sha1').update(raw).digest('hex');

  mkdirSync(SPEC_DIR, { recursive: true });
  writeFileSync(SPEC_FILE, raw);
  writeFileSync(HASH_FILE, `${sha1}\n`);
  writeFileSync(
    VERSION_FILE,
    `${JSON.stringify(
      {
        botApiVersion: `${major}.${minor}.${patch}`,
        recentChanges: spec.recent_changes,
        methods: spec.methods.length,
        objects: spec.objects.length,
        source: SPEC_URL,
        sha1,
      },
      null,
      2,
    )}\n`,
  );

  process.stdout.write(
    `Vendored Bot API ${major}.${minor}.${patch} — ` +
      `${spec.methods.length} methods, ${spec.objects.length} objects, ` +
      `${raw.length} bytes, sha1 ${sha1}\n`,
  );
}

updateSpec().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
