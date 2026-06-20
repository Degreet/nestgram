/**
 * The checkbox flow end to end through a booted app and the real pipeline: show
 * the menu, tap items, finish. No registration, no route strings, no toggle
 * handler — exactly what a bot author writes is exercised here.
 *
 * Proves the chain a real bot relies on:
 *   1. A bare `InlineKeyboard().checkboxes(id, …)` returned from a handler shows
 *      the picker; `default` seeds the first render before any tap.
 *   2. A tap (a `checkbox/<id>/toggle/<item>` callback) is handled by the BUILT-IN
 *      router — it persists to the per-MESSAGE keyboard state and edits the markup
 *      in place (an `EditMessageReplyMarkup`), with no code from the author.
 *   3. `cb.done()` → `@OnCheckboxDone(id)` runs through the full pipeline with the
 *      picks delivered straight to `@CheckboxIds(id)`.
 *
 * No network: the testbed captures every outgoing call; the keyboard-state store
 * is an inspectable in-memory store, keyed per message (`kbd:…:m<id>`).
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
import { MemoryStore } from '../../store/key-value-store';
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

  // Built once per render; `default` seeds the very first view, then the
  // per-message keyboard state takes over. Private — one class, one job (layout),
  // the binding does state.
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
  const store = new MemoryStore();

  beforeAll(async () => {
    bot = await NestgramTestbed.create({
      routers: [TopicsRouter],
      keyboardState: { store }, // inspectable, so we can assert what a tap persisted
    });
  });

  afterAll(() => bot.close());

  beforeEach(() => {
    bot.reset();
    TopicsRouter.finished.length = 0;
  });

  // Keyboard state is keyed per message, so each scenario pins its own picker
  // message id — the shared MemoryStore has no reset, and distinct messages keep
  // the cases independent. The tapping user is irrelevant to the key (Telegram
  // renders one shared markup per message).
  const stateKey = (msg: number): string => `kbd:ndefault:c1000:m${msg}`;
  const onPicker = (msg: number) => ({
    from: { id: 7, is_bot: false, first_name: 'U' },
    messageId: msg,
  });

  it('seeds the first render from `default` before any tap', async () => {
    await bot.dispatch(updates.message('hi'));

    expect(markupTexts(bot.lastMessage?.reply_markup)).toEqual([
      '✅ News', // default seed
      'Sport',
      'Tech',
      '✓ Done',
    ]);
  });

  it('taps persist to keyboard state and edit the markup in place, then done delivers the picks', async () => {
    const PICKER = 100; // all taps below sit on this one message
    await bot.dispatch(updates.message('hi')); // show the menu (registers the group)
    bot.reset();

    await bot.dispatch(
      updates.callbackQuery('checkbox/topics/toggle/tech', onPicker(PICKER)),
    );

    // The built-in router persisted the tap onto the default-seeded selection…
    expect(store.get(stateKey(PICKER))).toEqual({
      'checkbox:topics': ['news', 'tech'],
    });
    // …and edited the group's markup in place (a bare-keyboard return → ng-71).
    // The wire markup is serialized inside the request, so the state above is what
    // proves the tick; re-rendering here (outside the request) would read the
    // default, not the state — rendering-reflects-selection is a unit spec.
    const edit = bot.calls(EditMessageReplyMarkup).at(-1);
    expect(edit?.payload.reply_markup).toBeInstanceOf(InlineKeyboard);

    // Untick the seeded one — an empty selection is a real state, not a reseed.
    await bot.dispatch(
      updates.callbackQuery('checkbox/topics/toggle/news', onPicker(PICKER)),
    );
    expect(store.get(stateKey(PICKER))).toEqual({
      'checkbox:topics': ['tech'],
    });

    // Finish: @OnCheckboxDone runs through the full pipeline with the picks.
    await bot.dispatch(
      updates.callbackQuery('checkbox/topics/done', onPicker(PICKER)),
    );
    expect(TopicsRouter.finished).toEqual([['tech']]);
    // The string return answers the callback (a toast), carrying the live count.
    expect(bot.calls(AnswerCallbackQuery).at(-1)?.payload.text).toBe('Saved 1');
  });

  it('keeps two picker messages apart', async () => {
    await bot.dispatch(updates.message('hi')); // register the group

    // Two open pickers (e.g. one per user, each its own message) stay independent.
    await bot.dispatch(
      updates.callbackQuery('checkbox/topics/toggle/sport', onPicker(201)),
    );
    await bot.dispatch(
      updates.callbackQuery('checkbox/topics/toggle/tech', onPicker(202)),
    );

    expect(store.get(stateKey(201))).toEqual({
      'checkbox:topics': ['news', 'sport'], // picker 201: seed + its tap
    });
    expect(store.get(stateKey(202))).toEqual({
      'checkbox:topics': ['news', 'tech'], // picker 202: seed + its tap, untouched
    });
  });
});
