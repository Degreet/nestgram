import type {
  RawInlineKeyboardButton,
  RawLoginUrl,
} from '../events/raw-update.types';
import { CallbackRoutePattern } from '../callback-data';
import { ButtonStyle, ButtonStyleValue } from './button-style';
import { NOOP_CALLBACK_DATA } from './noop.constants';
import { RouteParamValues } from './route-params.types';

/**
 * One inline keyboard button, as an immutable value.
 *
 * A button is a first-class thing you can create, style, map over a collection,
 * and hand to a keyboard — so a dynamic keyboard reads as data flowing through
 * operators rather than a hand-rolled loop:
 *
 * ```ts
 * new InlineKeyboard()
 *   .map(products, (p) =>
 *     Button.text(p.name, 'buy/:id', { id: p.id }).if(p.inStock).else('Sold out'),
 *   )
 *   .split(2);
 * ```
 *
 * One static constructor per Bot API inline-button kind; the colour modifiers
 * (`.primary()`/`.success()`/`.danger()`) and `.if()`/`.else()` all return a new
 * value, so a `Button` is never mutated in place.
 *
 * @see https://core.telegram.org/bots/api#inlinekeyboardbutton
 */
export class Button {
  private constructor(
    private readonly spec: RawInlineKeyboardButton,
    private readonly hidden = false,
    private readonly fallback?: Button,
  ) {}

  /**
   * A callback button. Two forms, one mechanism: the framework assembles the
   * route, checking and escaping the parameters —
   * `Button.text('Done', 'reminder/done/:id', { id })` (the template-literal
   * types require every `:param`) — or you interpolate it yourself —
   * `` Button.text('Done', `reminder/done/${id}`) ``. Route the press with
   * `@Action('reminder/done/:id')` + `@Param('id')`.
   */
  static text<T extends string>(
    label: string,
    route: T,
    ...[params]: RouteParamValues<T>
  ): Button {
    const callbackData = params
      ? CallbackRoutePattern.build(route, params)
      : route;
    return new Button({ text: label, callback_data: callbackData });
  }

  /** A URL button: pressing it opens the link. */
  static url(label: string, url: string): Button {
    return new Button({ text: label, url });
  }

  /** A Web App button: pressing it opens the Mini App at `url`. */
  static webApp(label: string, url: string): Button {
    return new Button({ text: label, web_app: { url } });
  }

  /** A login button: pressing it authorizes the user (Telegram Login). */
  static loginUrl(label: string, url: string | RawLoginUrl): Button {
    return new Button({
      text: label,
      login_url: typeof url === 'string' ? { url } : url,
    });
  }

  /** Switch to inline mode in another chat, pre-filling `query`. */
  static switchInline(label: string, query = ''): Button {
    return new Button({ text: label, switch_inline_query: query });
  }

  /** Switch to inline mode in the current chat, pre-filling `query`. */
  static switchInlineCurrent(label: string, query = ''): Button {
    return new Button({
      text: label,
      switch_inline_query_current_chat: query,
    });
  }

  /** Copy `text` to the clipboard when pressed. */
  static copyText(label: string, text: string): Button {
    return new Button({ text: label, copy_text: { text } });
  }

  /** A pay button — valid only as the first button of an invoice message. */
  static pay(label: string): Button {
    return new Button({ text: label, pay: true });
  }

  /** A dead-end button — pressing it does nothing (a built-in just answers it). */
  static noop(label: string): Button {
    return new Button({ text: label, callback_data: NOOP_CALLBACK_DATA });
  }

  /** Adopt a raw Telegram button as a value — for editing an existing keyboard. */
  static from(raw: RawInlineKeyboardButton): Button {
    return new Button({ ...raw });
  }

  /** The button's visible label. */
  get label(): string {
    return this.spec.text;
  }

  /** The button's `callback_data`, when it is a callback button. */
  get callbackData(): string | undefined {
    return this.spec.callback_data;
  }

  /**
   * Keep this button only when `condition` is true; otherwise it is dropped when
   * added to a keyboard (or replaced by {@link else}). Lets `.map()` filter and
   * conditional buttons read in one line.
   */
  if(condition: boolean): Button {
    return new Button(this.spec, !condition, this.fallback);
  }

  /**
   * The button to show in place of this one when {@link if} hid it — a label (a
   * dead-end {@link noop}, e.g. `'Sold out'`) or a full replacement `Button`.
   */
  else(fallback: string | Button): Button {
    return new Button(
      this.spec,
      this.hidden,
      typeof fallback === 'string' ? Button.noop(fallback) : fallback,
    );
  }

  /**
   * Resolve the conditional for the keyboard: the button to render, or `null`
   * when it was hidden with no fallback.
   */
  resolve(): Button | null {
    if (!this.hidden) {
      return this;
    }
    return this.fallback ?? null;
  }

  /** A copy with a different label, keeping everything else — for editing. */
  withText(text: string): Button {
    return new Button({ ...this.spec, text }, this.hidden, this.fallback);
  }

  /** A copy styled blue — the main / affirmative action. */
  primary(): Button {
    return this.withStyle(ButtonStyle.Primary);
  }

  /** A copy styled green — a positive, confirming action. */
  success(): Button {
    return this.withStyle(ButtonStyle.Success);
  }

  /** A copy styled red — a destructive or cancelling action. */
  danger(): Button {
    return this.withStyle(ButtonStyle.Danger);
  }

  /** A fresh copy of the raw button — what the keyboard serializes. */
  toJSON(): RawInlineKeyboardButton {
    return { ...this.spec };
  }

  private withStyle(style: ButtonStyleValue): Button {
    return new Button({ ...this.spec, style }, this.hidden, this.fallback);
  }
}
