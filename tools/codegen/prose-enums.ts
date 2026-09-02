/**
 * Enum values as the Bot API states them: in a field's prose, never in the
 * source spec's structured data.
 *
 * Two callers, deliberately asymmetric. The generator's gate re-reads the prose
 * behind every enum the manifest already declares, and FAILS when the two
 * disagree. The spec-diff report reads the prose behind fields the manifest does
 * NOT declare, and merely PROPOSES them. Same extraction, opposite contract:
 * verification may be strict because a human vetted the field; proposal must not
 * be, because reading prose with a regular expression is guesswork.
 *
 * How wrong that guesswork is: pointed at the whole of Bot API 10.3 before any
 * of its proposals were acted on, this found 31 fields, of which 30 were real
 * enums and are now in the manifest. The one that was not is
 * `EncryptedPassportElement.data`, which matches on "Can be decrypted" and
 * quotes the element types that carry data rather than the values the field
 * takes. (Run it today and that lone false positive is all it still reports —
 * the rest resolved.) One in thirty-one is this spec's rate, not a guarantee:
 * the phrasings below pattern-match a page Telegram writes for humans. Fine for
 * a checklist a maintainer reads, wrong for anything that reaches the emitter,
 * so nothing here feeds the IR.
 */
import { Ir, IrField } from './ir';

/** A field that reads like an enum and is currently typed as a bare `string`. */
export interface EnumCandidate {
  /** The owning type or method name. */
  owner: string;
  field: string;
  literals: string[];
  /** The prose hedges its list, so the values belong in an OPEN union. */
  hedged: boolean;
}

export class ProseEnums {
  /** The `"quoted"` values in a field's prose — how Telegram spells an enum. */
  static literalsIn(prose: string): Set<string> {
    return new Set([...prose.matchAll(/"([^"]+)"/g)].map((match) => match[1]));
  }

  /**
   * Fields that look like an unclaimed enum, optionally narrowed to `owners`.
   *
   * "Unclaimed" is read off the lowered IR, not off the manifest tables. Three
   * separate things resolve a field away from `string`: the manifest's enum
   * tables, its named-type promotions, and the subtype discriminator `ir.ts`
   * recovers on its own. Reading the lowered type covers all three at once, so
   * anything still spelled `string` is genuinely untyped, whichever seam would
   * have claimed it.
   */
  static candidates(ir: Ir, owners: ReadonlySet<string>): EnumCandidate[] {
    const found: EnumCandidate[] = [];
    const consider = (owner: string, fields: readonly IrField[]): void => {
      if (!owners.has(owner)) {
        return;
      }
      for (const field of fields) {
        const candidate = ProseEnums.candidate(owner, field);
        if (candidate !== null) {
          found.push(candidate);
        }
      }
    };
    for (const object of ir.objects) {
      if (object.kind === 'interface') {
        consider(object.name, object.fields);
      }
    }
    for (const method of ir.methods) {
      consider(method.name, method.args);
    }
    return found.sort(
      (a, b) =>
        a.owner.localeCompare(b.owner) || a.field.localeCompare(b.field),
    );
  }

  private static candidate(
    owner: string,
    field: IrField,
  ): EnumCandidate | null {
    if (field.type.kind !== 'primitive' || field.type.ts !== 'string') {
      return null;
    }
    if (!ProseEnums.ENUMERATES.test(field.description)) {
      return null;
    }
    const literals = ProseEnums.literalsIn(field.description);
    if (literals.size < ProseEnums.MIN_LITERALS) {
      return null;
    }
    return {
      owner,
      field: field.name,
      literals: [...literals],
      hedged: ProseEnums.HEDGED.test(field.description),
    };
  }

  /**
   * The phrasings Telegram uses to introduce a value set. Not exhaustive by
   * design — a phrasing this misses costs a proposal, never a wrong type.
   */
  private static readonly ENUMERATES =
    /\b(?:one of|either|must be|can be|pass)\b/i;

  /**
   * "Currently" is Telegram's own hedge that the list may grow — the test the
   * manifest documents for choosing its open enum table over its closed one.
   */
  private static readonly HEDGED = /\bcurrently\b/i;

  /**
   * A single quoted value is a discriminator or an example, not a set — and the
   * uniform `always "x"` discriminator phrasing is already recovered in `ir.ts`.
   */
  private static readonly MIN_LITERALS = 2;
}
