import { NestgramConfigError } from '../exceptions/config.exception';

/**
 * Shared row layout for the keyboard builders.
 *
 * Buttons go into the current row; `.row()` forces a new one. `.columns(n)`
 * switches on auto-wrap: once a row holds `n` buttons, the next button starts a
 * fresh row — so you get an even grid without sprinkling `.row()` calls. Hidden
 * buttons are simply never added, so they don't take a grid slot and an
 * all-hidden row collapses away on serialize.
 */
export abstract class KeyboardBuilder<TButton> {
  protected readonly rows: TButton[][] = [[]];
  private columnLimit?: number;

  /**
   * Auto-wrap into rows of `count` (a grid). The limit applies to every
   * subsequent button, including any already in the current (in-progress) row —
   * call it right after `.row()` (or first) for a clean grid. `count` must be ≥ 1.
   */
  columns(count: number): this {
    if (count < 1) {
      throw new NestgramConfigError('columns(count) requires count >= 1');
    }
    this.columnLimit = count;
    return this;
  }

  /** Force a new row; subsequent buttons go into it. */
  row(): this {
    this.rows.push([]);
    return this;
  }

  /** Append a button, honoring the current column limit. */
  protected push(button: TButton): void {
    const current = this.rows[this.rows.length - 1];
    if (this.columnLimit !== undefined && current.length >= this.columnLimit) {
      this.rows.push([button]);
    } else {
      current.push(button);
    }
  }

  /** Rows with at least one button (drops the seed row and all-hidden rows). */
  protected get filledRows(): TButton[][] {
    return this.rows.filter((row) => row.length > 0);
  }
}
