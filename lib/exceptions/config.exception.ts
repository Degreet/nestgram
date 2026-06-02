/**
 * Thrown when Nestgram is misconfigured — e.g. a missing bot token, or a
 * `forRootAsync` call with no factory/class/existing provider. Surfaces a clear,
 * named error at boot instead of failing deep in the API later.
 */
export class NestgramConfigError extends Error {
  readonly name = 'NestgramConfigError';
}
