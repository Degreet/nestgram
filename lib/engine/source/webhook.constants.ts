/**
 * The route {@link WebhookController} serves; set `webhook.url` to
 * `https://<your-host>/<WEBHOOK_PATH>` so Telegram delivers here. Fixed (not
 * derived from `webhook.url`) so it also works under `forRootAsync`, where the
 * URL is resolved asynchronously and isn't known when the route is registered.
 */
export const WEBHOOK_PATH = 'telegram/webhook';
