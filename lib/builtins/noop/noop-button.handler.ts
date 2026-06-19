import { Router } from '../../decorators/injectable/router.decorator';
import { Action } from '../../decorators/listeners/action.decorator';
import { NOOP_CALLBACK_DATA } from '../../keyboards/noop.constants';

/**
 * Handles a no-op (dead-end) button — `Button.noop()` and `.else('label')`. The
 * press matches this route, so the auto-answer interceptor stops the spinner and
 * the dead-button warning never fires (the route is handled, on purpose); the
 * handler itself does nothing.
 *
 * Public and unprivileged — a user could have written the same `@Action`.
 */
@Router()
export class NoopButtonHandler {
  @Action(NOOP_CALLBACK_DATA)
  noop(): void {
    // A dead-end button does nothing but get answered.
  }
}
