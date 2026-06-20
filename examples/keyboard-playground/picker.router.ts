import {
  Router,
  Command,
  Action,
  KeyboardRender,
  OnCheckboxDone,
  CheckboxIds,
  Message,
  CallbackQuery,
  InlineKeyboard,
  Button,
  selectedIds,
  setSelectedIds,
} from 'nestgram';

import { CatalogService } from './catalog.service';

/**
 * The flagship: a category radio drives a scoped, paginated tag picker — two
 * scrollable linked lists in one declarative builder, with no nav or toggle
 * handlers of our own.
 *
 * - `@KeyboardRender('category', 'tags')` — the framework re-invokes `menu()` on
 *   every tap, so the keyboard is always a fresh projection of the latest state.
 * - `selectedIds('category')` reads the chosen category off the ambient rail and
 *   decides which tags render.
 * - `scope` partitions the tag selection per category (`checkbox:tags:<category>`),
 *   so switching categories never mixes picks. It re-reads the rail rather than
 *   the destructured `category`, which would be stale on a later build (Done, or
 *   the select-all action).
 * - `.paginate(id, { size })` inside a build scrolls only the rows above it, so the
 *   control row below stays pinned on every page; a tap keeps the current page.
 */
@Router()
export class PickerRouter {
  constructor(private readonly catalog: CatalogService) {}

  @Command('pick')
  open(message: Message): Promise<unknown> {
    return message.answer('🏷 Pick a category, then tag away:', {
      reply_markup: this.menu(),
    });
  }

  @KeyboardRender('category', 'tags')
  menu(): InlineKeyboard {
    const [category] = selectedIds('category');
    const tags = this.catalog.byCategory(category);

    return new InlineKeyboard()
      .radio(
        'category',
        (cb) =>
          cb
            .map(this.catalog.categories(), (c) => cb.toggle(c.label, c.id))
            .split(2)
            .paginate('category', { size: 6 }), // categories scroll
      )
      .checkboxes(
        'tags',
        (cb) =>
          cb
            .map(tags, (t) => cb.toggle(t.label, t.id))
            .split(2)
            .paginate('tags', { size: 6 }) // tags scroll above…
            // …and the controls stay pinned below the pager — `.paginate` only
            // scrolls the rows before it. `.if` keeps the row once a category is
            // chosen (nothing to act on before that).
            .row(
              Button.text('Select all', 'tags/all'),
              cb.clear('♻ Reset'),
              cb.done('✓ Done'),
            )
            .if(tags.length > 0),
        { scope: () => selectedIds('category')[0] }, // a separate tag set per category
      );
  }

  // A custom action — just an @Action. Mutate the selection through the rail,
  // then return the keyboard to re-render in place.
  @Action('tags/all')
  selectAll(): InlineKeyboard {
    const [category] = selectedIds('category');
    setSelectedIds(
      'tags',
      this.catalog.byCategory(category).map((t) => t.id),
    );
    return this.menu();
  }

  // Done sends a real message summarising the picks (a string return would only
  // surface as a callback toast, easy to miss). Resolve ids back to labels.
  @OnCheckboxDone('tags')
  done(
    query: CallbackQuery,
    @CheckboxIds('tags') ids: string[],
  ): Promise<unknown> | undefined {
    const [category] = selectedIds('category');
    const labels = this.catalog
      .byCategory(category)
      .filter((t) => ids.includes(t.id))
      .map((t) => t.label);
    const summary = labels.length
      ? `✅ Picked: ${labels.join(', ')}`
      : '🤷 Nothing picked yet';
    return query.message?.answer(summary);
  }
}
