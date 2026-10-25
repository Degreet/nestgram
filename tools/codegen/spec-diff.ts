/**
 * Reports what changed between the committed vendored spec and the one in the
 * working tree, as a Markdown checklist. `npm run spec:diff`.
 *
 * A spec bump is a 700KB one-line JSON diff — unreadable, and the interesting
 * part (which of OUR seams a change lands on) is not in it at all. This turns
 * the bump into the list a maintainer actually needs: new and removed methods
 * and types, and per-owner added, removed, and retyped fields. Read it BEFORE
 * touching the manifest; the CI drift workflow pastes it into the bump PR so a
 * failed codegen gate still arrives with its own diagnosis.
 *
 * Reads the previous spec from git (`HEAD`), so it works on an uncommitted
 * `spec:update` — which is exactly when it is wanted.
 *
 * Deliberately does NOT go through `loadSpec`: it must still produce a report
 * when the spec is the reason the generator refused, which is the run where a
 * maintainer most needs one. Every upstream string it prints is therefore
 * untrusted and passes through {@link SpecDiff.code} — this report is pasted
 * into a PR body that a human, or an agent, reads to decide what to do.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Ir } from './ir';
import { ProseEnums } from './prose-enums';
import { BotApiSpec, SpecField, SpecMethod, SpecType } from './spec.types';

const SPEC_PATH = 'tools/codegen/spec/api.min.json';
const SPEC_FILE = join(__dirname, 'spec', 'api.min.json');

/** An owner (type or method) whose field set moved. */
interface FieldChanges {
  owner: string;
  added: string[];
  removed: string[];
  retyped: string[];
}

class SpecDiff {
  constructor(
    private readonly before: BotApiSpec,
    private readonly after: BotApiSpec,
  ) {}

  /**
   * The previous spec as committed, or `null` when there genuinely isn't one.
   *
   * Only a missing path at HEAD is `null`. A broken git, a shallow checkout or
   * unparseable JSON THROWS: in CI this report is the whole diagnosis of a
   * failed bump, and degrading those into a confident "nothing to diff against"
   * is how a maintainer reads an empty report as good news.
   */
  static committed(): BotApiSpec | null {
    let raw: string;
    try {
      raw = execFileSync('git', ['show', `HEAD:${SPEC_PATH}`], {
        encoding: 'utf8',
        maxBuffer: SpecDiff.MAX_SPEC_BYTES,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      const stderr = String(
        (error as { stderr?: unknown }).stderr ?? '',
      ).toLowerCase();
      if (
        stderr.includes('does not exist') ||
        stderr.includes('exists on disk')
      ) {
        return null;
      }
      throw new Error(
        `Could not read HEAD:${SPEC_PATH} — ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return JSON.parse(raw) as BotApiSpec;
  }

  /** The vendored spec is ~700KB; the cap is headroom, not a limit to tune. */
  private static readonly MAX_SPEC_BYTES = 64 * 1024 * 1024;

  render(): string {
    const lines = [
      `## Spec diff — ${SpecDiff.code(this.before.version)} → ${SpecDiff.code(
        this.after.version,
      )}`,
      '',
    ];
    if (this.before.version === this.after.version) {
      lines.push(
        `Same version (${SpecDiff.code(
          this.after.version,
        )}); any changes below are an upstream re-scrape.`,
        '',
      );
    }

    const methods = this.namesDiff('methods');
    const types = this.namesDiff('types');
    this.section(lines, 'Methods', methods);
    this.section(lines, 'Types', types);

    const fields = [
      ...this.fieldChanges(this.before.types, this.after.types),
      ...this.fieldChanges(this.before.methods, this.after.methods),
    ];
    lines.push('### Changed fields', '');
    if (fields.length === 0) {
      lines.push('_None._', '');
    }
    for (const change of fields) {
      lines.push(`- **${SpecDiff.code(change.owner)}**`);
      for (const [label, entries] of [
        ['added', change.added],
        ['removed', change.removed],
        ['retyped', change.retyped],
      ] as const) {
        if (entries.length > 0) {
          lines.push(`  - ${label}: ${entries.join(', ')}`);
        }
      }
    }
    this.enumCandidates(
      lines,
      new Set([
        ...methods.added,
        ...types.added,
        ...fields.map((change) => change.owner),
        ...this.reworded(),
      ]),
    );
    lines.push('', SpecDiff.SEAMS);
    return `${lines.join('\n')}\n`;
  }

  /**
   * The seams a generated diff cannot speak for. Every item here is a judgment
   * call the emitter is designed NOT to make on its own, so the checklist is
   * what stands between a green regeneration and a wrong one.
   */
  private static readonly SEAMS = [
    '### Seams to check by hand',
    '',
    '- Each line under "Possible enums" above → `ENUM_LITERALS` (closed) or `OPEN_ENUM_LITERALS` (hedged), or neither when the prose only reads like an enum. Which table is a judgment call: the hedge is a hint, not the answer.',
    '- A prose enum that the list MISSED → the same two tables. It reads quoted values out of a sentence, so a field that names its values without quoting them (`sendChatAction.action`) can never appear there.',
    '- A new method returning `Message` → `METHOD_OVERRIDES` (return type + `wrap()`).',
    '- A method gaining an object alternative to a string field → `FORCED_POSITIONAL_CONTENT`.',
    '- A new `Update` field → `UpdateKind`, `KIND_ORDER`, a rich event, an `@On…` decorator.',
    '- A removed or renamed field on a hand-owned type → the gate reports it; edit the file by hand.',
  ].join('\n');

  /**
   * Fields in this bump that read like an enum and are still typed `string`.
   *
   * Scoped to the owners this diff already reports as new or changed. Unscoped,
   * the same thirty-odd lines would print on every bump until nobody reads them;
   * scoped, every line is about something that actually moved.
   *
   * A proposal, never a finding. Swept across Bot API 10.3 it named 31 fields,
   * 30 real and one that only reads like an enum — so each line is a question
   * for a maintainer, and picking the closed or the open table is the judgment
   * the emitter is designed not to make on its own.
   *
   * Lowering the IR here reads a spec that has NOT been through `loadSpec`,
   * because this report must survive the run where the spec is itself why the
   * generator refused. A lowering failure therefore degrades to a note: on that
   * run the rest of the diff is the part a maintainer needs.
   */
  private enumCandidates(lines: string[], owners: ReadonlySet<string>): void {
    if (lines[lines.length - 1] !== '') {
      lines.push('');
    }
    lines.push('### Possible enums among the changed fields', '');
    let ir: Ir;
    try {
      // Required here, not imported: `ir.ts` reaches `manifest.ts`, which throws
      // while being loaded if its enum tables disagree. At the top of the file
      // that throw escapes this catch and the report dies with it — exactly on
      // the mid-bump run where a maintainer is editing the manifest and wants
      // the checklist back.
      const { buildIr } = require('./ir') as typeof import('./ir');
      ir = buildIr(this.after);
    } catch (error) {
      lines.push(
        `_Could not lower the spec to look — ${SpecDiff.code(
          error instanceof Error ? error.message : String(error),
        )}_`,
      );
      return;
    }
    const candidates = ProseEnums.candidates(ir, owners);
    if (candidates.length === 0) {
      lines.push('_None._');
      return;
    }
    for (const candidate of candidates) {
      const hedge = candidate.hedged ? 'hedged "currently"' : 'no hedge';
      lines.push(
        `- ${SpecDiff.code(`${candidate.owner}.${candidate.field}`)} ` +
          `(${hedge}): ${SpecDiff.values(candidate.literals)}`,
      );
    }
  }

  /**
   * A candidate's values, capped: one field carries every reaction emoji
   * Telegram allows, and a checklist line is for recognising a set, not holding
   * it.
   */
  private static values(literals: readonly string[]): string {
    const shown = literals.slice(0, SpecDiff.MAX_LITERALS).map(SpecDiff.code);
    const hidden = literals.length - shown.length;
    return hidden > 0
      ? `${shown.join(', ')} (+${hidden} more)`
      : shown.join(', ');
  }

  private static readonly MAX_LITERALS = 12;

  private section(lines: string[], title: string, diff: NamesDiff): void {
    lines.push(`### ${title}`, '');
    if (diff.added.length === 0 && diff.removed.length === 0) {
      lines.push('_No additions or removals._', '');
      return;
    }
    if (diff.added.length > 0) {
      lines.push(
        `- Added (${diff.added.length}): ${diff.added
          .map(SpecDiff.code)
          .join(', ')}`,
      );
    }
    if (diff.removed.length > 0) {
      lines.push(
        `- **Removed (${diff.removed.length}):** ${diff.removed
          .map(SpecDiff.code)
          .join(', ')}`,
      );
    }
    lines.push('');
  }

  /**
   * Owners where a field kept its name and type but had its prose rewritten.
   *
   * The one blind spot between this report and the generator's gate. A field
   * that gains a value set in prose alone is structurally unchanged, so nothing
   * above reports it; and being unclaimed by the manifest, the gate has no entry
   * to check it against either. It feeds the enum proposals only — a reworded
   * sentence is not a spec change worth listing as one.
   */
  private reworded(): string[] {
    const owners: string[] = [];
    for (const key of ['types', 'methods'] as const) {
      const after: Record<string, SpecType | SpecMethod> = this.after[key];
      for (const [owner, entry] of Object.entries(after)) {
        const was = SpecDiff.byName(this.before[key][owner]?.fields);
        const reworded = (entry.fields ?? []).some(
          (field) =>
            was.has(field.name) &&
            was.get(field.name)?.description !== field.description,
        );
        if (reworded) {
          owners.push(owner);
        }
      }
    }
    return owners;
  }

  private namesDiff(key: 'methods' | 'types'): NamesDiff {
    const before = new Set(Object.keys(this.before[key]));
    const after = new Set(Object.keys(this.after[key]));
    return {
      added: [...after].filter((name) => !before.has(name)).sort(),
      removed: [...before].filter((name) => !after.has(name)).sort(),
    };
  }

  private fieldChanges(
    before: Record<string, SpecType | SpecMethod>,
    after: Record<string, SpecType | SpecMethod>,
  ): FieldChanges[] {
    const changes: FieldChanges[] = [];
    for (const [owner, entry] of Object.entries(after)) {
      const previous = before[owner];
      if (previous === undefined) {
        continue;
      }
      const was = SpecDiff.byName(previous.fields);
      const now = SpecDiff.byName(entry.fields);
      const change: FieldChanges = {
        owner,
        added: [...now.keys()]
          .filter((name) => !was.has(name))
          .map((name) => SpecDiff.spell(now.get(name))),
        removed: [...was.keys()]
          .filter((name) => !now.has(name))
          .map(SpecDiff.code),
        retyped: [...now.keys()]
          .filter((name) => was.has(name))
          .filter((name) => SpecDiff.moved(was.get(name), now.get(name)))
          .map(
            (name) =>
              `${SpecDiff.spell(was.get(name))} → ${SpecDiff.spell(
                now.get(name),
              )}`,
          ),
      };
      if (
        change.added.length > 0 ||
        change.removed.length > 0 ||
        change.retyped.length > 0
      ) {
        changes.push(change);
      }
    }
    return changes.sort((a, b) => a.owner.localeCompare(b.owner));
  }

  private static byName(
    fields: SpecField[] | undefined,
  ): Map<string, SpecField> {
    return new Map((fields ?? []).map((field) => [field.name, field]));
  }

  /** Optionality counts as a move: it flips a field between `x` and `x?`. */
  private static moved(was?: SpecField, now?: SpecField): boolean {
    return (
      was !== undefined &&
      now !== undefined &&
      (was.required !== now.required ||
        was.types.join('|') !== now.types.join('|'))
    );
  }

  private static spell(field?: SpecField): string {
    if (field === undefined) {
      return '?';
    }
    return SpecDiff.code(
      `${field.name}${field.required ? '' : '?'}: ${field.types.join(' | ')}`,
    );
  }

  /**
   * One upstream string, rendered as inline code that cannot escape its own
   * span: backticks would close it, newlines and pipes would break out of the
   * list or table row, and either lets a hostile spec forge headings — a fake
   * "gate passed, nothing to check" above the real report is all it would take.
   */
  private static code(text: string): string {
    return `\`${text.replace(/[`\r\n|]/g, ' ').slice(0, SpecDiff.MAX_NAME)}\``;
  }

  /** Long enough for any real declaration; short enough to bound a hostile one. */
  private static readonly MAX_NAME = 200;
}

interface NamesDiff {
  added: string[];
  removed: string[];
}

function main(): void {
  const before = SpecDiff.committed();
  if (before === null) {
    process.stdout.write(
      `No committed spec at HEAD:${SPEC_PATH} — nothing to diff against.\n`,
    );
    return;
  }
  const after = JSON.parse(readFileSync(SPEC_FILE, 'utf8')) as BotApiSpec;
  process.stdout.write(new SpecDiff(before, after).render());
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `${
      error instanceof Error ? error.stack ?? error.message : String(error)
    }\n`,
  );
  process.exitCode = 1;
}
