import { NestgramConfigError } from '../exceptions/config.exception';
import { ButtonStyle, StyleableButton } from './button-style';

/**
 * Shared row layout for the keyboard builders.
 *
 * Buttons go into the current row; `.row()` forces a new one. `.columns(n)`
 * switches on auto-wrap: once a row holds `n` buttons, the next button starts a
 * fresh row — so you get an even grid without sprinkling `.row()` calls. Hidden
 * buttons are simply never added, so they don't take a grid slot and an
 * all-hidden row collapses away on serialize.
 *
 * A colour modifier (`.primary()`/`.success()`/`.danger()`) styles the NEXT
 * button only — it sets a pending style the next button consumes, so
 * `.danger().text('Delete', 'del')` reads as "this one button is red".
 */
export abstract class KeyboardBuilder<TButton extends StyleableButton> {
  protected readonly rows: TButton[][] = [[]];
  private columnLimit?: number;
  private pendingStyle?: ButtonStyle;

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

  /** Style the next button blue — the main / affirmative action. */
  primary(): this {
    this.pendingStyle = ButtonStyle.Primary;
    return this;
  }

  /** Style the next button green — a positive, confirming action. */
  success(): this {
    this.pendingStyle = ButtonStyle.Success;
    return this;
  }

  /** Style the next button red — a destructive or cancelling action. */
  danger(): this {
    this.pendingStyle = ButtonStyle.Danger;
    return this;
  }

  /**
   * Append a button, honoring the current column limit. A pending colour is
   * consumed here whether or not the button is shown — so a hidden button takes
   * its intended style down with it instead of leaking it onto the next one.
   */
  protected push(button: TButton, hidden = false): void {
    const style = this.pendingStyle;
    this.pendingStyle = undefined;
    if (hidden) {
      return;
    }
    if (style !== undefined) {
      button.style = style;
    }
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
