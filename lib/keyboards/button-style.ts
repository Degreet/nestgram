/**
 * Every visual style Telegram accepts on a keyboard button's `style`. The single
 * source of truth for button-style values across the framework — assign or
 * compare against `ButtonStyle.X`, never a bare string. Omitting it lets the app
 * pick its default style.
 *
 * @see https://core.telegram.org/bots/api#inlinekeyboardbutton
 */
export enum ButtonStyle {
  /** Blue — the affirmative / main action. */
  Primary = 'primary',
  /** Green — a positive, confirming action. */
  Success = 'success',
  /** Red — a destructive or cancelling action. */
  Danger = 'danger',
}

/**
 * A button `style` accepted in markup — the string values of {@link ButtonStyle},
 * so markup can be written as plain literals (`'primary'`) with autocomplete and
 * no enum import, while framework code uses `ButtonStyle.X`.
 */
export type ButtonStyleValue = `${ButtonStyle}`;

/** The slice of a button the keyboard builders stamp a pending style onto. */
export interface StyleableButton {
  style?: ButtonStyleValue;
}
