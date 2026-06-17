import { CallbackRoutePattern } from '../callback-data';
import { ButtonStyleValue } from './button-style';
import { KeyboardBuilder } from './keyboard-builder';
import { RouteParamArgs } from './route-params.types';

interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
  style?: ButtonStyleValue;
}

/**
 * Fluent builder for an inline keyboard (buttons attached under a message).
 *
 * Buttons go into the current row; `.row()` starts a new one, or `.columns(n)`
 * auto-wraps into a grid. A trailing `hidden` flag drops the button (handy for
 * conditional buttons: `.text('Admin', 'admin', !isAdmin)`). A colour modifier
 * (`.primary()`/`.success()`/`.danger()`) styles the next button. Pass the
 * instance as `reply_markup` — `JSON.stringify` calls `toJSON()`, serializing to
 * the Telegram `{ inline_keyboard }` shape.
 *
 * ```ts
 * new InlineKeyboard()
 *   .columns(2)
 *   .primary().text('Buy', 'buy')
 *   .text('Info', 'info');
 * ```
 */
export class InlineKeyboard extends KeyboardBuilder<InlineButton> {
  /**
   * A callback button. Two forms, one mechanism — a safe default and a terse
   * shortcut, like `SendMessage` vs `message.answer`:
   *
   * - the framework assembles the route, checking and escaping the parameters —
   *   `.text('Done', 'reminder/done/:id', { id })` (the template-literal types
   *   require every `:param`);
   * - or you interpolate it yourself — `` .text('Done', `reminder/done/${id}`) ``
   *   — terse, no parameter check, no escaping (fine for the numeric-id case).
   *
   * Pressing the button sends the resulting `callback_data` back; route it with
   * `@Action('reminder/done/:id')` + `@Param('id')`.
   */
  text<T extends string>(
    label: string,
    route: T,
    ...rest: RouteParamArgs<T>
  ): this;
  text(
    label: string,
    route: string,
    paramsOrHidden?: Record<string, string | number> | boolean,
    hidden = false,
  ): this {
    const assembled = typeof paramsOrHidden === 'object';
    const callbackData = assembled
      ? CallbackRoutePattern.build(route, paramsOrHidden)
      : route;
    const isHidden =
      typeof paramsOrHidden === 'boolean' ? paramsOrHidden : hidden;
    this.push({ text: label, callback_data: callbackData }, isHidden);
    return this;
  }

  /** A URL button: pressing it opens the link. */
  url(label: string, url: string, hidden = false): this {
    this.push({ text: label, url }, hidden);
    return this;
  }

  toJSON(): { inline_keyboard: InlineButton[][] } {
    return { inline_keyboard: this.filledRows };
  }
}
