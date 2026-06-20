/**
 * The checkbox flow end to end through a booted app and the real pipeline: show
 * the menu, tap items, finish. No registration, no route strings, no toggle
 * handler — exactly what a bot author writes is exercised here.
 *
 * Proves the chain a real bot relies on:
 *   1. A bare `InlineKeyboard().checkboxes(id, …)` returned from a handler shows
 *      the picker; `default` seeds the first render before any tap.
 *   2. A tap (a `checkbox/<id>/toggle/<item>` callback) is handled by the BUILT-IN
 *      router — it persists to the per-user session and edits the markup in place
 *      (an `EditMessageReplyMarkup`), with no code from the author.
 *   3. `cb.done()` → `@OnCheckboxDone(id)` runs through the full pipeline with the
 *      picks delivered straight to `@CheckboxIds(id)`.
 *
 * No network: the testbed captures every outgoing call; the session is the real
 * `MemorySessionStore`.
 */
import {
  CheckboxIds,
  InlineKeyboard,
  Message,
  OnCheckboxDone,
  OnMessage,
  Router,
} from '../..';
import { AnswerCallbackQuery, EditMessageReplyMarkup } from '../../api/methods';
import { MemorySessionStore, SessionModule } from '../../sessions';
import { NestgramTestbed, updates } from '../../testing';

const CHECKBOX_GROUP = 'topics';

const TOPICS = [
  { id: 'news', name: 'News' },
  { id: 'sport', name: 'Sport' },
  { id: 'tech', name: 'Tech' },
];

@Router()
class TopicsRouter {
  static finished: string[][] = [];

  @OnMessage()
  open(message: Message): Promise<unknown> {
    return message.answer('Pick topics', { reply_markup: this.menu() });
  }

  @OnCheckboxDone(CHECKBOX_GROUP)
  done(@CheckboxIds(CHECKBOX_GROUP) ids: string[]): string {
    TopicsRouter.finished.push([...ids].sort());
    return `Saved ${ids.length}`;
  }

  // Built once per render; `default` seeds the very first view, then the session
  // takes over. Private — one class, one job (layout), the binding does state.
  private menu(): InlineKeyboard {
    return new InlineKeyboard().checkboxes(
      CHECKBOX_GROUP,
      (cb) =>
        cb
          .map(TOPICS, (t) => cb.toggle(t.name, t.id))
          .split(1)
          .row(cb.done('✓ Done')),
      { default: ['news'] },
    );
  }
}

const markupTexts = (kb: unknown): string[] =>
  (kb as InlineKeyboard)
    .toJSON()
    .inline_keyboard.flat()
    .map((b) => b.text as string);

describe('checkbox flow (booted app)', () => {
  let bot: NestgramTestbed;
  const store = new MemorySessionStore();

  beforeAll(async () => {
    bot = await NestgramTestbed.create({
      routers: [TopicsRouter],
      imports: [SessionModule.forRoot({ store, defaults: (): object => ({}) })],
    });
  });

  afterAll(() => bot.close());

  beforeEach(() => {
    bot.reset();
    TopicsRouter.finished.length = 0;
  });

  // The shared MemoryStore has no reset, so each test uses its own user id — the
  // session key is per-user, keeping the cases independent without a clear().
  const sessionKey = (userId: number): string => `ndefault:c1000:u${userId}`;
  const asUser = (id: number) => ({
    from: { id, is_bot: false, first_name: 'U' },
  });

  it('seeds the first render from `default` before any tap', async () => {
    await bot.dispatch(updates.message('hi', asUser(1)));

    expect(markupTexts(bot.lastMessage?.reply_markup)).toEqual([
      '✅ News', // default seed
      'Sport',
      'Tech',
      '✓ Done',
    ]);
  });

  it('taps persist to the session and edit the markup in place, then done delivers the picks', async () => {
    const user = asUser(2); // same user/chat across the updates → one session
    await bot.dispatch(updates.message('hi', user)); // show the menu (registers the group)
    bot.reset();

    await bot.dispatch(
      updates.callbackQuery('checkbox/topics/toggle/tech', user),
    );

    // The built-in router persisted the tap onto the default-seeded selection…
    expect(store.get(sessionKey(2))).toEqual({
      'checkbox:topics': ['news', 'tech'],
    });
    // …and edited the group's markup in place (a bare-keyboard return → ng-71).
    // The wire markup is serialized inside the request, so the session state above
    // is what proves the tick; re-rendering here (outside the request) would read
    // the default, not the session — rendering-reflects-selection is a unit spec.
    const edit = bot.calls(EditMessageReplyMarkup).at(-1);
    expect(edit?.payload.reply_markup).toBeInstanceOf(InlineKeyboard);

    // Untick the seeded one — an empty selection is a real state, not a reseed.
    await bot.dispatch(
      updates.callbackQuery('checkbox/topics/toggle/news', user),
    );
    expect(store.get(sessionKey(2))).toEqual({ 'checkbox:topics': ['tech'] });

    // Finish: @OnCheckboxDone runs through the full pipeline with the picks.
    await bot.dispatch(updates.callbackQuery('checkbox/topics/done', user));
    expect(TopicsRouter.finished).toEqual([['tech']]);
    // The string return answers the callback (a toast), carrying the live count.
    expect(bot.calls(AnswerCallbackQuery).at(-1)?.payload.text).toBe('Saved 1');
  });

  it('keeps two users apart in the same chat', async () => {
    const alice = asUser(11);
    const bob = asUser(22);

    await bot.dispatch(updates.message('hi', alice)); // register the group
    await bot.dispatch(
      updates.callbackQuery('checkbox/topics/toggle/sport', alice),
    );
    await bot.dispatch(
      updates.callbackQuery('checkbox/topics/toggle/tech', bob),
    );

    expect(store.get(sessionKey(11))).toEqual({
      'checkbox:topics': ['news', 'sport'], // Alice: seed + her tap
    });
    expect(store.get(sessionKey(22))).toEqual({
      'checkbox:topics': ['news', 'tech'], // Bob: seed + his tap, untouched by Alice
    });
  });
});
