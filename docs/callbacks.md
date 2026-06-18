---
title: Callbacks
description: Handle inline button presses as callback routes — @Action, @Param, edit, and answer.
sidebar:
  group: Events & replies
  order: 33
---

When a user taps an inline button, Telegram sends a **callback query** carrying
the `callback_data` you set on the button. In Nestgram that data is a **route**:
you handle it with `@Action()`, the same way a controller handles a URL.

:::mental
button tap -> callback query -> @Action route -> @Param + answer + edit
:::

## Callback routes

Callback data is where magic strings breed: a `'buy:42'` literal when you build
the button, a regex to match it, a `split(':')` to read the id back — three
places to drift apart. So treat it like a URL. `@Action('buy/:id')` names a
route: `/` divides segments and a leading `:` marks a parameter. `@Param('id')`
hands you that segment, and a pipe decodes and validates it — exactly like
`@Get('users/:id')` with `ParseIntPipe` in an HTTP controller.

:::code[shop.router.ts]{mark="22"}

```ts
import {
  Router,
  Command,
  Action,
  Param,
  Message,
  CallbackQuery,
  InlineKeyboard,
} from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Router()
export class ShopRouter {
  @Command('shop')
  shop(message: Message) {
    const keyboard = new InlineKeyboard()
      .text('Buy #42', 'buy/:id', { id: 42 })
      .text('Info', 'info');

    return message.answer('One product today:', { reply_markup: keyboard });
  }

  // matches callback_data like `buy/42`
  @Action('buy/:id')
  buy(query: CallbackQuery, @Param('id', ParseIntPipe) id: number) {
    return query.answer(`Added product ${id} to cart`);
  }

  // matches callback_data === 'info'
  @Action('info')
  info(query: CallbackQuery) {
    return query.answer('Nestgram — the NestJS way');
  }
}
```

:::

The handler receives a typed `CallbackQuery` — positional, no decorator. The
keyboard builds the wire value for you: `.text(label, 'buy/:id', { id: 42 })`
fills the template, and the types require every `:param`, so a button can't
drift from its route. `@Param('id', ParseIntPipe)` reads the `id` segment and
the pipe turns it into a `number` — any Nest pipe, built-in or your own, with no
regex capture or `split` of your own. The keyboard builder itself is covered in
[Commands & keyboards](/docs/commands-and-keyboards).

For a one-off button you can interpolate the value yourself —
`` .text('Buy', `buy/${id}`) `` — terser, but it skips the parameter check and
the separator escaping, so keep it to plain numeric ids.

:::note
Plain matching is there for the simple cases: `@Action('refresh')` for an exact
string, `@Action()` for any callback query, `@Action(/^legacy:/)` for a regex,
and `@CallbackData()` to inject the raw `query.data` string when that's all you
need. The moment the data carries values, prefer a route over parsing the
string yourself.
:::

### Namespacing and sharing a route

`@Router('shop')` prefixes every route in the router, so `@Action('buy/:id')`
matches `shop/buy/:id` on the wire. When the button is built somewhere else — a
keyboard service, another router — keep the template in one place so the two
ends can't drift. A plain `const` is enough:

:::code[shop.routes.ts]

```ts
export const BUY_ROUTE = 'buy/:id';
```

:::

Use `BUY_ROUTE` in both `@Action(BUY_ROUTE)` and
`.text('Buy', BUY_ROUTE, { id })` — one source of truth. A button whose route
matches no handler logs a **dead-button** warning when it's pressed, so a typo
surfaces in development.

## Unhandled updates

That dead-button warning is itself an `@OnUnhandled` handler — a public hook the
framework runs when an update matches **no** route. Add your own to log a miss,
record a metric, or reply with a fallback:

:::code[fallback.router.ts]

```ts
import { Router, OnUnhandled, Sender, RawUpdate, User } from 'nestgram';

@Router()
export class FallbackRouter {
  @OnUnhandled()
  unhandled(update: RawUpdate, @Sender() user?: User) {
    console.warn(`No route for update ${update.update_id} from ${user?.id}`);
    return "Sorry, I didn't understand that.";
  }
}
```

:::

The first parameter is the raw update — an unmatched update can be any kind, so
it isn't a single rich event. Reach for `@Sender()`/`@Chat()` for the common
derived values (they work for every kind), and `return` a string to reply. The
handler runs through the full pipeline, so an unmatched `callback_query` is
auto-answered unless you add `@NoAutoAnswer()`.

Every `@OnUnhandled` handler runs (they observe, not compete), so reply from at
most one. The built-in dead-button warning is one of them — silence it with
`warnUnhandledCallbacks: false` in `NestgramModule.forRoot`.

## Answering the callback query

Every callback query should be answered, even if you have nothing to say —
otherwise the user sees a spinner on the button. `query.answer()` does this.

:::code[noop.router.ts]

```ts
@Action('noop')
noop(query: CallbackQuery) {
  return query.answer(); // stops the loading spinner, no toast
}

@Action('saved')
saved(query: CallbackQuery) {
  return query.answer('Saved!', { show_alert: true }); // modal alert
}
```

:::

`query.alert('Saved!')` is a shortcut for the modal form.

:::warn[Answer every callback]
If you never answer a callback query, the button keeps spinning for up to a
minute.

> when in doubt, call `query.answer()`

:::

## Editing the message

A callback usually updates the message the button lives on. `query.message`
is the `Message` the keyboard is attached to, so the same actions you already
know apply — but it's optional (`message?: Message`): a button can live on an
inline-mode message, where there's no chat message to edit (only
`inline_message_id`). Guard it before editing.

:::code[paginate.router.ts]

```ts
import { Action, Param, CallbackQuery, InlineKeyboard } from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Action('page/:n')
paginate(query: CallbackQuery, @Param('n', ParseIntPipe) page: number) {
  if (!query.message) {
    return query.answer();
  }

  const keyboard = new InlineKeyboard()
    .text('◀', 'page/:n', { n: page - 1 })
    .text(`${page}`, 'noop')
    .text('▶', 'page/:n', { n: page + 1 });

  return query.message.editText(`Page ${page}`, { reply_markup: keyboard });
}
```

:::

`editText` edits the text (and optionally the markup); there's also
`editReplyMarkup` when you only want to change the buttons.
