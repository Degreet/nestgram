# Working in a Nestgram bot

Rules for AI coding agents (and humans) writing a Telegram bot with
[Nestgram](https://nestgram.vercel.app). Drop this file in your repo root so
your coding assistant writes idiomatic Nestgram instead of falling back on
telegraf/grammY habits. Everything below is the real, current API.

Nestgram is a **NestJS framework** for the Telegram Bot API. A `@Router()` is a
controller, an update is a request, a handler's **return value is the reply**.
You reuse Nest's whole pipeline — guards, interceptors, pipes, exception filters
— because handlers run through Nest's own `ExternalContextCreator`.

## The mental model — get this right

- **Handlers are router methods.** Decorate a method with a route
  (`@OnStart()`, `@Command(...)`, `@Hears(...)`, `@Action(...)`, `@OnMessage()`,
  `@On*()`). The first matching route wins, in **declaration order** within a
  router.
- **The first parameter is the typed event — bare, no decorator.**
  `handle(message: Message)`, `handle(query: CallbackQuery)`. The framework
  injects it. Do not put a decorator on parameter 0.
- **Return the reply.** Return a `string` to send text; return a method object
  like `new SendMessage(...)` / `new SendPhoto(...)` to send anything; or call
  the sugar on the event (`message.answer(...)`, `query.answer(...)`,
  `query.editText(...)`). Return `undefined`/`void` to do nothing.
- **Param decorators are for cross-cutting/derived values only** — never the
  main event. `@Sender() user: User`, `@Chat() chat: Chat`,
  `@Param('id', ParseIntPipe) id: number`, `@Args() args: string[]`,
  `@Text() text: string`, `@CallbackData() data: ...`, `@Session() s: ...`,
  `@State() st: ...`.
- **i18n is ambient and import-based.** `t('key', vars)` and `locale()` are
  free functions you `import { t, locale } from 'nestgram'` — you do not inject
  them. They read an `AsyncLocalStorage` scoped to the current update.
- **Register routers like any Nest provider.** Put them in a module's
  `providers: [...]`; Nestgram discovers them at boot. No manual wiring.

## Coming from telegraf / grammY — the replacements

Do **not** reach for these patterns. Nestgram has no `bot`, no middleware
stack, and no god-context.

| telegraf / grammY habit            | Nestgram equivalent                                               |
| ---------------------------------- | ----------------------------------------------------------------- |
| `bot.use(mw)` / middleware         | Nest `@UseGuards` / `@UseInterceptors` / `@UsePipes` / filters     |
| `bot.command('x', ...)`            | `@Command('x')` on a `@Router()` method                           |
| `ctx` god-object                   | the typed event arg (`message: Message`) + param decorators       |
| `ctx.reply('hi')`                  | `return 'hi'` or `message.answer('hi')`                           |
| `ctx.session`                      | `@Session()` param decorator                                       |
| `ctx.match` (regex)                | `@Matches()` (full match) or named groups → `@Param('name')`      |
| manual `callback_data` parsing     | `@Action('done/:id')` + `@Param('id')`                            |
| `bot.catch(...)`                   | a Nest `@Catch()` exception filter                                 |

## Which internal tool — decision lines

- **Pick which handler runs** → a route / match predicate (`@Command`, `@Hears`,
  `@Action`, `@Match(...)`, custom predicate).
- **Allow or deny before the handler** → a **guard**.
- **Wrap, log, time, or post-process** → an **interceptor** (this is also how
  every built-in behaviour ships — see below).
- **Validate or coerce a param** → a **pipe** (`ParseIntPipe`, `ValidationPipe`
  + a `class-validator` DTO).
- **Turn an error into a reply** → an **exception filter** (`@Catch()`).
- **State that lives one update** → `@State()`.
- **State across updates (per user/chat)** → `@Session()` with a
  `MemorySessionStore` / `RedisSessionStore`.
- **A multi-step conversation** → the FSM (`stateGroup()`, `@Fsm()`) / scenes.

## Routing cheatsheet (real API)

```ts
import {
  Router, OnStart, OnHelp, Command, Hears, Action, OnMessage,
  Message, CallbackQuery, User, Sender, Param, t,
} from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Router()
export class DemoRouter {
  // /start (canonical). Deep links: @OnStart('ref_:code') + @Param('code').
  @OnStart()
  start(message: Message, @Sender() user: User) {
    return message.answer(`Hello, ${user.first_name}!`);
  }

  // Command params live in the template; @Param pulls them out, pipe-validated.
  @Command('remind :text...')
  @Hears(/^in \d+[smhd] /i) // stack routes — same handler, first match wins
  remind(message: Message) {
    return t('remind.scheduled');
  }

  // Callback buttons: a route template, then typed params.
  @Action('done/:id')
  done(query: CallbackQuery, @Param('id', ParseIntPipe) id: number) {
    return query.answer('Done');
  }

  @OnMessage()
  echo(message: Message) {
    return message.text;
  }
}
```

## No privileged core

Built-in behaviours are **toggleable interceptors**, configured on the module —
not hidden internals. You can disable any of them, or replace one with your own
interceptor:

| Built-in              | What it does                                  | Toggle (module option) |
| --------------------- | --------------------------------------------- | ---------------------- |
| Auto-answer callbacks | answers a `CallbackQuery` so the spinner ends | on by default          |
| Default parse mode    | applies `parseMode` to outgoing text          | `parseMode`            |
| Send throttler        | respects Telegram flood limits                | `throttle`             |
| Ignore not-modified   | swallows `message is not modified` on edits   | `ignoreNotModified`    |

To add your own cross-cutting behaviour, write a normal Nest interceptor and
`@UseInterceptors(...)` it — there is no bespoke plugin API to learn.

## Hard rules

- Import everything from the **`nestgram`** package.
- This is a **pre-release** — install with `npm install nestgram@next`. Plain
  `npm install nestgram` gives the old, incompatible v1.
- Peers: `@nestjs/common` and `@nestjs/core` `^10.4.1 || ^11`,
  `reflect-metadata`, `rxjs`, `class-validator` + `class-transformer` (for
  DTOs). Import `reflect-metadata` once at the top of `main.ts`.
- It compiles under `strict: true`. Don't reach for `any` or `@ts-ignore` —
  the events are fully typed; ask for the type you want.
- Webhook transport adds `controllers: [WebhookController]` and a normal
  `app.listen(port)`; polling uses `polling: true` and needs no HTTP server.
