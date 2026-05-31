---
title: Commands, parameters & keyboards
description: Parse commands, pull values with parameter decorators, and build inline and reply keyboards.
---

# Commands, parameters & keyboards

Now that updates reach your router, let's make handlers expressive: parse
command arguments, pull just the values you need, and send keyboards.

## Commands and their arguments

`@Command('start')` matches `/start`. The text after the command is
available without any string-slicing of your own.

```ts
import { Router, Command, Message, Args, Payload } from 'nestgram';

@Router()
export class OrderRouter {
  // /order 3 large
  @Command('order')
  order(message: Message, @Args() args: string[], @Payload() payload: string) {
    // args    → ['3', 'large']
    // payload → '3 large'
    return `Ordering ${args[0]} × ${args[1]} size`;
  }
}
```

- `@Args()` gives the whitespace-split arguments.
- `@Payload()` gives the raw remainder — handy for deep links like
  `/start ref_123`, where `payload === 'ref_123'`.

## Parameter decorators

The main event is always positional and typed. Parameter decorators are for
**derived or cross-cutting** values — things you *could* read off the event
but want named directly:

```ts
import { Router, Command, Sender, Chat, User } from 'nestgram';
import type { Chat as TgChat } from 'nestgram';

@Router()
export class WhoAmIRouter {
  @Command('whoami')
  whoami(@Sender() user: User, @Chat() chat: TgChat) {
    return `You are ${user.first_name} (id ${user.id}) in chat ${chat.id}`;
  }
}
```

| Decorator         | Gives you                                  |
| ----------------- | ------------------------------------------ |
| `@Sender()`       | the `User` who triggered the update        |
| `@Chat()`         | the `Chat` the update happened in          |
| `@Args()`         | command arguments as `string[]`            |
| `@Payload()`      | raw text after the command                 |
| `@CallbackData()` | a callback query's `data` string           |
| `@Session()`      | the current session object                 |

> [!NOTE]
> These never collide with type names — `@Sender()` is a decorator, `User` is
> a type, and you can import both. That collision is exactly what we avoid by
> keeping the main event positional.

## Inline keyboards

Build keyboards with a chainable builder and pass them through the normal
`reply_markup` option — the options bag mirrors the Telegram API, so
everything autocompletes.

```ts
import { Router, Command, Message, InlineKeyboard } from 'nestgram';

@Router()
export class MenuRouter {
  @Command('menu')
  menu(message: Message) {
    const keyboard = new InlineKeyboard()
      .text('Buy', 'buy:1')
      .text('Info', 'info:1')
      .row()
      .url('Website', 'https://nestgram.com');

    return message.answer('What would you like?', { reply_markup: keyboard });
  }
}
```

`.row()` starts a new row; consecutive calls share the current one. Handling
the `buy:1` press is the next page,
[Callbacks →](./03-callbacks.md).

## Reply keyboards

Same builder shape, for the custom keyboard under the input field:

```ts
import { ReplyKeyboard } from 'nestgram';

const keyboard = new ReplyKeyboard()
  .text('My orders')
  .row()
  .contact('Share phone')
  .location('Share location')
  .resize()
  .oneTime();

return message.answer('Menu:', { reply_markup: keyboard });
```

`.resize()` and `.oneTime()` map to the Telegram `resize_keyboard` and
`one_time_keyboard` flags — named for discoverability, but the underlying
markup is exactly what the API expects.

## answer vs reply

- `message.answer(text)` sends a new message to the same chat.
- `message.reply(text)` sends it as a Telegram reply (quoting the original).

Both accept the full set of `SendMessage` options as a second argument.

## Next

Time to handle button presses: [Callbacks →](./03-callbacks.md)
