/**
 * A command object the handler can return to be executed (the underlying layer
 * beneath `message.answer(...)` sugar).
 *
 * `SendMessage` / `SendPhoto` / `SendMediaGroup` already satisfy this: they
 * extend `ApiMethod` and expose `.fetch()`.
 */
export interface Command {
  fetch(): Promise<unknown>;
}

/**
 * Narrow a handler return value to a command object.
 *
 * Structural check on `fetch` (Q-EXEC: the "loose" duck-typed variant). The
 * tight `instanceof ApiMethod` variant is avoided here because `ApiMethod` is
 * an abstract class merged with a same-named interface, which does not import
 * cleanly as a value; the structural guard is sufficient since `fetch` is the
 * command contract and a handler that returns a plain object will not have it.
 */
export function isCommand(value: unknown): value is Command {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Command).fetch === 'function'
  );
}
