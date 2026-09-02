import type {
  RawInlineKeyboardButton,
  RawLoginUrl,
} from '../events/raw-update.types';
import { CallbackRoutePattern } from '../callback-data';
import { ButtonStyle, ButtonStyleValue } from './button-style';
import { CHECKBOX_DEFAULT_MARKERS } from './checkbox.constants';
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

  /**
   * A checkbox-style callback button: a ✅ marker before the label when `on`
   * (nothing when off), routed like {@link text}. The low-level primitive for a
   * hand-rolled picker, so a checkbox list reads as a plain mapped keyboard —
   *
   * ```ts
   * new InlineKeyboard()
   *   .map(items, (i) => Button.toggle(sel.has(i.id), i.name, 'pick/:id', { id: i.id }))
   *   .split(2);
   * ```
   *
   * — where you own the toggle `@Action`. `InlineKeyboard.checkboxes(...)` is the
   * batteries-included builder (routing, persistence, pagination) over the same idea.
   */
  static toggle<T extends string>(
    on: boolean,
    label: string,
    route: T,
    ...[params]: RouteParamValues<T>
  ): Button {
    const marker = on
      ? CHECKBOX_DEFAULT_MARKERS.on
      : CHECKBOX_DEFAULT_MARKERS.off;
    const text = marker ? `${marker} ${label}` : label;
    const callbackData = params
      ? CallbackRoutePattern.build(route, params)
      : route;
    return new Button({ text, callback_data: callbackData });
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
   * The button to show in place of this one when {@link if} hid it — a label,
   * which becomes a {@link disabled} button (e.g. `'Sold out'`), or a full
   * replacement `Button`.
   */
  else(fallback: string | Button): Button {
    return new Button(
      this.spec,
      this.hidden,
      typeof fallback === 'string' ? Button.disabled(fallback) : fallback,
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

  /**
   * A copy Telegram renders inert — pressing it does nothing, client-side, with
   * no round trip.
   *
   * `disabled` is a button TYPE, not a flag: the spec allows exactly one of
   * `url` / `callback_data` / `disabled` / … per button, and Telegram silently
   * drops the field when a second one is present. So this REPLACES whatever the
   * button did, keeping only what the spec permits alongside a type (`text`,
   * `style`, `icon_custom_emoji_id`). A disabled button has no action by
   * definition, which is what makes that safe.
   *
   * Takes a condition so it composes like {@link if} —
   * `Button.text('Buy', 'buy/:id', { id }).disabled(!inStock)` is a live buy
   * button when in stock and an inert one when not.
   *
   */
  disabled(disabled = true): Button {
    if (!disabled) {
      return this;
    }
    return new Button(
      { ...Button.typeless(this.spec), disabled: {} },
      this.hidden,
      this.fallback,
    );
  }

  /** A button that is inert from the start, with no action to strip. */
  static disabled(label: string): Button {
    return new Button({ text: label, disabled: {} });
  }

  /**
   * The parts of a button that are NOT its type — everything a new type may be
   * paired with. Spec: "Exactly one of the fields other than text,
   * icon_custom_emoji_id, and style must be used to specify the type".
   */
  private static typeless(
    spec: RawInlineKeyboardButton,
  ): RawInlineKeyboardButton {
    return {
      text: spec.text,
      ...(spec.style !== undefined && { style: spec.style }),
      ...(spec.icon_custom_emoji_id !== undefined && {
        icon_custom_emoji_id: spec.icon_custom_emoji_id,
      }),
    };
  }

  /** A fresh copy of the raw button — what the keyboard serializes. */
  toJSON(): RawInlineKeyboardButton {
    return { ...this.spec };
  }

  private withStyle(style: ButtonStyleValue): Button {
    return new Button({ ...this.spec, style }, this.hidden, this.fallback);
  }
}
