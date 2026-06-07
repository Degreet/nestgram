/**
 * A command's text did not satisfy its `commandArgs(...)` schema — a required
 * argument was missing or a token did not fit its type. Branded so a handler's
 * exception filter can catch exactly this (`@Catch(CommandArgsError)`) and reply
 * with usage help, rather than swallowing every error.
 */
export class CommandArgsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandArgsError';
  }
}
