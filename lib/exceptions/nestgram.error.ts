/**
 * Base class for every error Nestgram throws. Catch this to handle any
 * framework error uniformly; catch a subclass (`NestgramConfigError`,
 * `ApiException`) for a specific kind.
 */
export class NestgramError extends Error {
  readonly name: string = 'NestgramError';
}
