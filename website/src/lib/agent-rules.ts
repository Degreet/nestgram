import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Single source of truth for "how to write a Nestgram bot" — the very file
// authors drop into their repo root as AGENTS.md. Read once at build time so
// the AI-facing endpoints (/llms.txt, /llms-full.txt) carry the same rules and
// never drift from it. The build runs from `website/`, so the template sits one
// level up.
export const AGENT_RULES = readFileSync(
  resolve(process.cwd(), '../templates/AGENTS.md'),
  'utf-8',
).trim();
