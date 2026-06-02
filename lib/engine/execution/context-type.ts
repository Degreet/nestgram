/**
 * The custom Nest `contextType` the engine passes to `ExternalContextCreator`.
 *
 * Guards and interceptors read it via `ctx.getType()` to tell a Telegram update
 * apart from an HTTP/WS/RPC context.
 */
export const NESTGRAM_CONTEXT_TYPE = 'telegram' as const;

export type NestgramContextType = typeof NESTGRAM_CONTEXT_TYPE;
