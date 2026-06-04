import { RawUpdate } from '../../events/raw-update.types';

/** Called once per incoming update. May be async; the source awaits it. */
export type UpdateListener = (update: RawUpdate) => void | Promise<void>;

/**
 * A pluggable source of Telegram updates.
 *
 * The source's single responsibility is *delivery*: get updates from the
 * transport and hand each one to the listener. What happens to an update
 * (routing, execution, result handling) is the dispatcher's concern, not the
 * source's. Polling and webhook both implement this contract, so switching
 * transport never touches the dispatcher.
 */
export interface UpdateSource {
  /** Begin delivering updates to `onUpdate`. Resolves once the source is live. */
  start(onUpdate: UpdateListener): Promise<void>;
  /** Stop delivering and release the transport. Resolves once fully stopped. */
  stop(): Promise<void>;
}
