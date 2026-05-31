---
title: Callbacks
description: Handle inline button presses with @Action, edit messages, and answer callback queries.
---

# Callbacks

When a user taps an inline button, Telegram sends a **callback query** with
the `callback_data` you set on the button. Handle it with `@Action()`.

## Matching callback data

`@Action()` is to callback queries what `@Command()` is to messages. It takes
an exact string or a regular expression.

```ts
import { Router, Action, CallbackQuery, CallbackData } from 'nestgram';

@Router()
export class MenuCallbacksRouter {
  // matches callback_data === 'info:1'
  @Action('info:1')
  info(query: CallbackQuery) {
    return query.answer('Nestgram — the NestJS way');
  }

  // matches e.g. 'buy:42'
  @Action(/^buy:(\d+)$/)
  buy(query: CallbackQuery, @CallbackData() data: string) {
    const productId = data.split(':')[1];
    return query.message.editText(`Added product ${productId} to cart ✅`);
  }
}
```

The handler receives a typed `CallbackQuery` — again, positional, no
decorator. `@CallbackData()` is sugar for `query.data` when that's all you
need.

> [!TIP]
> For regex captures, take `@Match() match: RegExpMatchArray` and read
> `match[1]`, `match[2]`, … instead of re-parsing the string yourself.

## Answering the callback query

Every callback query should be answered, even if you have nothing to say —
otherwise the user sees a spinner on the button. `query.answer()` does this.

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

> [!WARNING]
> If you never answer a callback query, the button keeps spinning for up to a
> minute. When in doubt, answer it.

## Editing the message

A callback usually updates the message the button lives on.
`query.message` is the `Message` the keyboard is attached to, so the same
actions you already know apply:

```ts
import { InlineKeyboard } from 'nestgram';

@Action(/^page:(\d+)$/)
paginate(query: CallbackQuery, @Match() match: RegExpMatchArray) {
  const page = Number(match[1]);

  const keyboard = new InlineKeyboard()
    .text('◀', `page:${page - 1}`)
    .text(`${page}`, 'noop')
    .text('▶', `page:${page + 1}`);

  return query.message.editText(`Page ${page}`, { reply_markup: keyboard });
}
```

`editText` edits the text (and optionally the markup); there's also
`editReplyMarkup` when you only want to change the buttons.

## Next

Your bot is interactive. Now lock it down with
[guards & the Nest pipeline →](./04-guards-and-pipeline.md)
