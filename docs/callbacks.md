---
title: Callbacks
description: Handle inline button presses with @Action, edit messages, and answer callback queries.
sidebar:
  group: Events & replies
  order: 33
---

When a user taps an inline button, Telegram sends a **callback query** with
the `callback_data` you set on the button. Handle it with `@Action()`.

:::mental
button tap -> callback query -> @Action handler\* -> answer + edit
:::

## Matching callback data

Callback data is where magic strings breed: a `'buy:'` literal when you build
the button, a regex to match it, a `split(':')` to read the id back — three
places to drift apart. Define the data **once** with `callbackData()` and use
the same definition everywhere: `.pack()` builds the button data,
`.filter()` matches it in `@Action()`, and `@Data()` hands you the parsed,
typed values.

:::code[shop.router.ts]{mark="12"}

```ts
import {
  Router,
  Command,
  Action,
  Message,
  CallbackQuery,
  InlineKeyboard,
  callbackData,
  Data,
} from 'nestgram';

const Buy = callbackData('buy', { productId: Number });

@Router()
export class ShopRouter {
  @Command('shop')
  shop(message: Message) {
    const keyboard = new InlineKeyboard()
      .text('Buy #42', Buy.pack({ productId: 42 }))
      .text('Info', 'info');

    return message.answer('One product today:', { reply_markup: keyboard });
  }

  // matches any callback_data packed by Buy
  @Action(Buy.filter())
  buy(query: CallbackQuery, @Data() data: { productId: number }) {
    return query.answer(`Added product ${data.productId} to cart`);
  }

  // matches callback_data === 'info'
  @Action('info')
  info(query: CallbackQuery) {
    return query.answer('Nestgram — the NestJS way');
  }
}
```

:::

The handler receives a typed `CallbackQuery` — again, positional, no
decorator. `@Data()` injects the values decoded by the definition the handler
matched on: `data.productId` is already a `number`, with no regex capture or
`split` of your own.

The schema maps each field to its constructor (`Number`, `String`,
`Boolean`); omit it entirely for a payload-less button —
`callbackData('menu').pack()`. The keyboard builder itself is covered in
[Commands & keyboards](/docs/commands-and-keyboards).

:::note
Plain matching is still there for simple cases: `@Action('info')` for an
exact string, `@Action(/^legacy:/)` for a regex, and `@CallbackData()` to
inject the raw `query.data` string — sugar for `query.data` when that's all
you need. The moment the data carries values, prefer the typed definition
over parsing the string yourself.
:::

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
import { InlineKeyboard, callbackData } from 'nestgram';

const Page = callbackData('page', { page: Number });

@Action(Page.filter())
paginate(query: CallbackQuery, @Data() { page }: { page: number }) {
  if (!query.message) {
    return query.answer();
  }

  const keyboard = new InlineKeyboard()
    .text('◀', Page.pack({ page: page - 1 }))
    .text(`${page}`, 'noop')
    .text('▶', Page.pack({ page: page + 1 }));

  return query.message.editText(`Page ${page}`, { reply_markup: keyboard });
}
```

:::

`editText` edits the text (and optionally the markup); there's also
`editReplyMarkup` when you only want to change the buttons.
