/**
 * The custom Nest `contextType` the engine passes to `ExternalContextCreator`.
 *
 * Proven safe in ECC-NOTES.md (Q-CONTEXTTYPE): guards/interceptors see it
 * via `ctx.getType()` and execution is unaffected.
 */
export const NESTGRAM_CONTEXT_TYPE = 'telegram' as const;

export type NestgramContextType = typeof NESTGRAM_CONTEXT_TYPE;
