import type {
  RawInlineKeyboardButton,
  RawInlineKeyboardMarkup,
} from '../events/raw-update.types';
import { CallbackRoutePattern } from '../callback-data';
import { Button } from './button';
import { KeyboardBuilder } from './keyboard-builder';
import { RouteParamArgs } from './route-params.types';

/**
 * Fluent builder for an inline keyboard (buttons attached under a message).
 *
 * Three ways in, one model — a button is a value ({@link Button}):
 *
 * - **fluent shortcuts** for the everyday kinds — `.text()`, `.url()`,
 *   `.webApp()`, `.switchInline()` — each with a trailing `hidden` flag for
 *   conditional buttons (`.text('Admin', 'admin', !isAdmin)`);
 * - **`.add(...buttons)`** takes `Button` values directly — the universal inlet,
 *   so every Bot API kind is reachable (`.add(Button.pay('Pay'))`);
 * - **`.map(items, fn)`** turns a collection into buttons, so a dynamic keyboard
 *   reads as data, not a loop.
 *
 * `.row()` starts a new row (`.row(...buttons)` lays an explicit one),
 * `.columns(n)` auto-wraps into a grid, and a colour modifier
 * (`.primary()`/`.success()`/`.danger()`) styles the next button. Pass the
 * instance as `reply_markup` — `JSON.stringify` calls `toJSON()`.
 *
 * ```ts
 * new InlineKeyboard()
 *   .map(products, (p) => Button.text(p.name, 'buy/:id', { id: p.id }))
 *   .columns(2)
 *   .row(Button.url('Catalog', site));
 * ```
 */
export class InlineKeyboard extends KeyboardBuilder<RawInlineKeyboardButton> {
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
    return this.add1(Button.url(label, url), hidden);
  }

  /** A Web App button: pressing it opens the Mini App at `url`. */
  webApp(label: string, url: string, hidden = false): this {
    return this.add1(Button.webApp(label, url), hidden);
  }

  /** Switch to inline mode in another chat, pre-filling `query`. */
  switchInline(label: string, query = '', hidden = false): this {
    return this.add1(Button.switchInline(label, query), hidden);
  }

  /** Switch to inline mode in the current chat, pre-filling `query`. */
  switchInlineCurrent(label: string, query = '', hidden = false): this {
    return this.add1(Button.switchInlineCurrent(label, query), hidden);
  }

  /** Copy `text` to the clipboard when pressed. */
  copyText(label: string, text: string, hidden = false): this {
    return this.add1(Button.copyText(label, text), hidden);
  }

  /**
   * Add `Button` values into the current flow (honoring `.columns()`). The
   * universal inlet — every Bot API button kind is reachable as a `Button`,
   * including the special ones (`.add(Button.pay('Pay'))`).
   */
  add(...buttons: Button[]): this {
    for (const button of buttons) {
      this.push(button.toJSON());
    }
    return this;
  }

  /**
   * Turn a collection into buttons. `fn` returns a `Button` for each item, or a
   * falsy value to drop it — so conditional buttons need no separate filter. The
   * buttons feed the current flow, so `.columns(n)` lays them into a grid.
   *
   * ```ts
   * .columns(2).map(items, (i) => Button.text(i.label, 'pick/:id', { id: i.id }))
   * ```
   */
  map<T>(
    items: readonly T[],
    fn: (item: T, index: number) => Button | null | undefined | false,
  ): this {
    items.forEach((item, index) => {
      const button = fn(item, index);
      if (button) {
        this.push(button.toJSON());
      }
    });
    return this;
  }

  /**
   * Start a new row. With buttons, lay exactly those into it (ignoring
   * `.columns()`) — an explicit row; with none, just open a fresh row for the
   * buttons that follow.
   */
  row(...buttons: Button[]): this {
    if (buttons.length === 0) {
      return super.row();
    }
    this.pushRow(buttons.map((button) => button.toJSON()));
    super.row();
    return this;
  }

  toJSON(): RawInlineKeyboardMarkup {
    return { inline_keyboard: this.filledRows };
  }

  /** Push one `Button` through the column flow, honoring a trailing `hidden` flag. */
  private add1(button: Button, hidden: boolean): this {
    this.push(button.toJSON(), hidden);
    return this;
  }
}
