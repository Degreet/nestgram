/**
 * Pure name transforms. Bot API method names are already camelCase
 * (`sendMessage`); objects are PascalCase (`Message`); fields are snake_case
 * and are emitted verbatim (never transformed — transport keys off them).
 */

/** `sendMessage` → `SendMessage`. */
export function methodToClassName(method: string): string {
  return method.charAt(0).toUpperCase() + method.slice(1);
}

/** `SendMessage` → `send-message`, `EditMessageReplyMarkup` → `edit-message-reply-markup`. */
export function classToFileName(className: string): string {
  return className
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}
