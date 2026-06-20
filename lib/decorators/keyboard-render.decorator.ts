import { NestgramConfigError } from '../exceptions/config.exception';
import { Metadata } from './metadata.enum';

/**
 * Marks a router method as the **renderer** for one or more keyboard groups: the
 * `() => InlineKeyboard` the framework re-invokes to rebuild the message in place
 * after an interaction (a checkbox tap today; pagination/linked selects next).
 *
 * The method is the single source of truth for the keyboard — you call it to show
 * the keyboard, and the framework calls the same method to re-render. Because it
 * runs fresh on every interaction (inside the update's ambient scope), it re-reads
 * state and re-derives its data each time, so the whole keyboard — not just the
 * tapped group — reflects the latest state. Discovered at boot, so re-rendering
 * survives a restart (unlike a keyboard thrown inline from a handler, whose
 * registration is lost). May be `async` to pull data from a service.
 *
 * Pass the group id(s) the method renders — one method can render several groups
 * (e.g. a category picker and its dependent tags), so a tap on any of them
 * re-invokes it.
 *
 * ```ts
 * @Router()
 * class TopicsRouter {
 *   @Command('topics')
 *   open() { return this.menu(); } // show
 *
 *   @KeyboardRender('topics')
 *   menu(): InlineKeyboard {        // re-render source
 *     return new InlineKeyboard().checkboxes('topics', (cb) =>
 *       cb.map(this.topics.all(), (t) => cb.toggle(t.name, t.id)).split(1),
 *     );
 *   }
 * }
 * ```
 */
export const KeyboardRender = (...ids: string[]): MethodDecorator => {
  if (ids.length === 0) {
    throw new NestgramConfigError(
      '@KeyboardRender() needs at least one keyboard group id to render.',
    );
  }
  return (
    _target: object,
    _key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(Metadata.KEYBOARD_RENDER, ids, descriptor.value);
  };
};
