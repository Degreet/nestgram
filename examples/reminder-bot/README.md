# Reminder bot — a production-shaped Nestgram example

A Telegram reminder bot that shows Nestgram living inside a **real NestJS app**:
Postgres persistence (TypeORM), background delivery on a **BullMQ + Redis**
queue, config from the environment, guards, interceptors, typed callback data,
keyboards, **i18n** (per-user locale), and both transports (polling for dev,
webhook for prod). One file = one entity throughout.

> The point: a Telegram bot is _just another Nest app_. The Telegram-specific
> code is the routers; everything else (DI, modules, TypeORM, BullMQ, config) is
> ordinary NestJS.

## What it demonstrates

| Nestgram feature                                                 | Where                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| `@Router()` controllers across feature modules                   | `reminders/`, `admin/`                                  |
| `@Command` · `@Hears` (string + regex) · `@Action`               | `reminder.router.ts`                                    |
| Typed positional event + `@Sender` / `@Payload` / `@Data`        | `reminder.router.ts`                                    |
| Typed callback data (`pack`/`filter`/`@Data`) — no magic strings | `reminder.callbacks.ts`                                 |
| Inline + reply keyboards                                         | `reminder.presenter.ts`, `common/main-menu.keyboard.ts` |
| **i18n**: free `t()` + per-user locale, localized catalogs       | `i18n/`, every router/presenter                         |
| Localized reply-menu matched via a **custom predicate**          | `common/menu.predicate.ts`                              |
| i18n across the **queue boundary** (explicit locale)             | `reminder.processor.ts`                                 |
| Pure logic as DI providers (parser, presenter — SRP)             | `reminder.parser.ts`, `reminder.presenter.ts`           |
| Rich-event actions (`message.answer`, `query.message.editText`)  | `reminder.router.ts`                                    |
| A real Nest **guard** (`@UseGuards`) reading the update          | `admin/admin.guard.ts`                                  |
| A real Nest **interceptor** (`@UseInterceptors`)                 | `common/logging.interceptor.ts`                         |
| Default `parseMode: 'HTML'` + `i18n`, configured once            | `app.module.ts`                                         |
| `forRootAsync` — token/transport from `ConfigService`            | `app.module.ts`                                         |
| Sending **outside a handler** via `BotService` (queue worker)    | `reminder.processor.ts`                                 |
| Graceful shutdown of the update source                           | `main.ts` (`enableShutdownHooks`)                       |

The reminder _delivery_ runs on a BullMQ worker — outside the per-update
context — so it carries the chat id explicitly and talks to Telegram through the
injected `BotService`. That's the framework's prescribed pattern for crossing a
queue boundary.

## Prerequisites

- Node 20+, Docker (for Postgres + Redis), a bot token from [@BotFather](https://t.me/BotFather).

## Setup

```bash
# 1. Build the framework once (this example depends on it via `file:../..`).
cd ../..            # repo root
npm install && npm run build

# 2. Install the example's own dependencies.
cd examples/reminder-bot
npm install

# 3. Configure.
cp .env.example .env      # then put your BOT_TOKEN and ADMIN_IDS in .env

# 4. Start Postgres + Redis.
docker compose up -d

# 5. Run the bot (long polling — no public URL needed).
npm run start:dev
```

Message your bot: `/start`, then `/remind in 10s ping me` and watch it fire.

## Commands

- `/start` — welcome + menu keyboard.
- `/remind in 10m <text>` — schedule (or just send `2h Call mom`).
- `/list` — pending reminders with ✓ / 🗑 inline buttons.
- `/help` — usage.
- `/stats`, `/broadcast <msg>` — **admin only** (ids in `ADMIN_IDS`).

## Switching to webhook (production)

Set in `.env`:

```
USE_WEBHOOK=true
WEBHOOK_URL=https://your-domain.example/telegram/webhook
WEBHOOK_SECRET=<a long random string>
```

The app already mounts Nestgram's `WebhookController` at `/telegram/webhook`
and validates the secret token. Put it behind HTTPS (a reverse proxy or a
tunnel like ngrok) so Telegram can reach it.

## Notes

- `synchronize: true` (TypeORM) auto-creates the schema for convenience — use
  migrations in a real deployment.
- The example resolves `nestgram` from the local build (`file:../..`); after
  changing framework code, re-run `npm run build` at the repo root.
