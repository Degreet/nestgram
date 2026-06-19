import { NestgramConfigError } from '../exceptions/config.exception';
import { ButtonStyle, ButtonStyleValue, StyleableButton } from './button-style';

/** What `.if()` targets: the buttons added since `from` in `pending`, or rows added since `from`. */
type LastUnit =
  | { readonly kind: 'pending'; readonly from: number }
  | { readonly kind: 'rows'; readonly from: number };

/**
 * Shared layout engine for the keyboard builders.
 *
 * Buttons accumulate in `pending` (the current, unfinished row); a layout method
 * commits them into rows. `.split(n)` cuts the accumulated buttons into rows of
 * `n` (`.map(...).split(2)` reads the same as `.text().text().split(2)`),
 * `.spread()` is one per row, and `.row()` commits them as a single row. `.group`
 * builds a block of rows in a sub-builder. Every unit — a button, a row, a split
 * section or a group — can be kept conditionally with a trailing `.if(cond)`. A
 * colour modifier (`.primary()`/`.success()`/`.danger()`) styles the button just
 * added (postfix), so `.text('Delete', 'del').danger()` reads "this one is red".
 */
export abstract class KeyboardBuilder<TButton extends StyleableButton> {
  protected readonly rows: TButton[][] = [];
  protected readonly pending: TButton[] = [];
  private lastUnit?: LastUnit;

  /** Lay the accumulated buttons into rows of `count` columns. `count` must be ≥ 1. */
  split(count: number): this {
    if (count < 1) {
      throw new NestgramConfigError('split(count) requires count >= 1');
    }
    this.flushInto(count);
    return this;
  }

  /** One accumulated button per row — a vertical list (`split(1)`). */
  spread(): this {
    return this.split(1);
  }

  /** Commit the accumulated buttons as a single row. */
  row(): this {
    this.flushInto(Math.max(this.pending.length, 1));
    return this;
  }

  /**
   * Keep the last unit only when `condition` is true. The unit is whatever was
   * just produced: a button (after `.text()`/`.add()`/`.map()`), a row (after
   * `.row()`), a split section (after `.split()`) or a group (after `.group()`).
   */
  if(condition: boolean): this {
    // A unit is consumed by `.if()` either way, so a following `.if()` can't
    // re-target it (`.text(...).if(true).if(false)` keeps the button).
    const unit = this.lastUnit;
    this.lastUnit = undefined;
    if (condition || unit === undefined) {
      return this;
    }
    if (unit.kind === 'pending') {
      this.pending.length = unit.from;
    } else {
      this.rows.length = unit.from;
    }
    return this;
  }

  /**
   * Build a block of rows in a sub-builder, then append it — for an irregular
   * section (rows of different widths). Pair with `.if()` to show it
   * conditionally: `.group((kb) => kb.row(...).text(...)).if(isAdmin)`.
   */
  group(build: (keyboard: this) => void): this {
    const SubBuilder = this.constructor as new () => this;
    const sub = new SubBuilder();
    build(sub);
    const from = this.rows.length;
    for (const row of sub.drainRows()) {
      this.rows.push(row);
    }
    this.lastUnit = { kind: 'rows', from };
    return this;
  }

  /** Style the just-added button blue — the main / affirmative action. */
  primary(): this {
    return this.style(ButtonStyle.Primary);
  }

  /** Style the just-added button green — a positive, confirming action. */
  success(): this {
    return this.style(ButtonStyle.Success);
  }

  /** Style the just-added button red — a destructive or cancelling action. */
  danger(): this {
    return this.style(ButtonStyle.Danger);
  }

  /** Accumulate one button into the current row (a single `.if()`-able unit). */
  protected pushButton(button: TButton): void {
    const from = this.pending.length;
    this.pending.push(button);
    this.lastUnit = { kind: 'pending', from };
  }

  /** Accumulate a batch of buttons as one `.if()`-able unit (`.add()`/`.map()`). */
  protected pushButtons(buttons: TButton[]): void {
    const from = this.pending.length;
    this.pending.push(...buttons);
    this.lastUnit = { kind: 'pending', from };
  }

  /**
   * Replace the builder's rows with a deep copy of `rows` — how `.from(markup)`
   * adopts an existing keyboard for editing. The deep copy (including nested
   * `web_app`/`copy_text`/… objects) is what lets edits never reach back into the
   * source markup.
   */
  protected adopt(rows: TButton[][]): void {
    this.rows.length = 0;
    for (const row of rows) {
      this.rows.push(row.map((button) => structuredClone(button)));
    }
  }

  /** Drop emptied rows, keeping at least one open row for further edits. */
  protected compactRows(): void {
    const kept = this.rows.filter((row) => row.length > 0);
    this.rows.length = 0;
    this.rows.push(...(kept.length > 0 ? kept : [[]]));
  }

  /** The final rows — committed rows plus any still-accumulated buttons as a last row. */
  protected get filledRows(): TButton[][] {
    const all =
      this.pending.length > 0 ? [...this.rows, this.pending] : this.rows;
    // Copy each row so a serialized snapshot never aliases the builder's arrays.
    return all.filter((row) => row.length > 0).map((row) => [...row]);
  }

  private style(style: ButtonStyleValue): this {
    const last = this.pending[this.pending.length - 1];
    if (last !== undefined) {
      last.style = style;
    }
    return this;
  }

  private flushInto(perRow: number): void {
    if (this.pending.length === 0) {
      this.lastUnit = undefined;
      return;
    }
    const batch = this.pending.splice(0);
    const from = this.rows.length;
    for (let index = 0; index < batch.length; index += perRow) {
      this.rows.push(batch.slice(index, index + perRow));
    }
    this.lastUnit = { kind: 'rows', from };
  }

  private drainRows(): TButton[][] {
    if (this.pending.length > 0) {
      this.flushInto(this.pending.length);
    }
    return this.rows;
  }
}
