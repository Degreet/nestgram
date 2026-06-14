/**
 * Default route the ready-made {@link WebhookController} serves; set
 * `webhook.url` to `https://<your-host>/<WEBHOOK_PATH>` so Telegram delivers
 * here. For a different route, register `createWebhookController(path)` instead.
 */
export const WEBHOOK_PATH = 'telegram/webhook';

/** The header Telegram sends the configured secret token in. */
export const SECRET_HEADER = 'x-telegram-bot-api-secret-token';

/**
 * Build the webhook URL to register with Telegram (`setWebhook`), kept in sync
 * with the ready-made controllers' routes so the registered URL can't drift from
 * the served route. Pass the public origin as `baseUrl` (e.g.
 * `https://bots.example.com`). With a `name` it returns the per-bot path the
 * {@link MultiBotWebhookController} serves (`<baseUrl>/<WEBHOOK_PATH>/<name>`);
 * without, the single shared/default endpoint (`<baseUrl>/<WEBHOOK_PATH>`).
 *
 * The name is percent-encoded so a bot named with URL-unsafe characters still
 * produces a URL that matches the decoded `:botName` route segment.
 */
export function webhookUrl(baseUrl: string, name?: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return name
    ? `${base}/${WEBHOOK_PATH}/${encodeURIComponent(name)}`
    : `${base}/${WEBHOOK_PATH}`;
}
