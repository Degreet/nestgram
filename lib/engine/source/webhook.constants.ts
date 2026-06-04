/**
 * Default route the ready-made {@link WebhookController} serves; set
 * `webhook.url` to `https://<your-host>/<WEBHOOK_PATH>` so Telegram delivers
 * here. For a different route, register `createWebhookController(path)` instead.
 */
export const WEBHOOK_PATH = 'telegram/webhook';
