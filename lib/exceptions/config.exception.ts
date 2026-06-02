import { NestgramError } from './nestgram.error';

/**
 * Thrown when Nestgram is misconfigured or its API is misused at setup — a
 * missing bot token, a `forRootAsync` call with no factory/class/existing
 * provider, an empty `@Command('')`, an invalid keyboard `columns()`, etc.
 * Surfaces a clear, named error early instead of failing deep later.
 */
export class NestgramConfigError extends NestgramError {
  readonly name = 'NestgramConfigError';
}
