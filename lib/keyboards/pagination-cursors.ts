import { CallbackRoutePattern } from '../callback-data';
import type { RawInlineKeyboardMarkup } from '../events/raw-update.types';
import { PAGINATE_AT_ROUTE, PAGINATE_PARAMS } from './pagination.constants';

/**
 * Recover each paginated section's current page from a rendered keyboard — the
 * `pageat/<section>/<page>` counters the keyboard carries for exactly this. The
 * cursor lives in the keyboard's own callback-data (not a store), so on any tap
 * the page of every section is read back from the incoming markup, and a re-render
 * (a checkbox toggle as much as a page tap) keeps each section on its page.
 */
export function readPaginationCursors(
  markup: RawInlineKeyboardMarkup,
): Record<string, number> {
  const cursors: Record<string, number> = {};
  const counter = CallbackRoutePattern.compile(PAGINATE_AT_ROUTE);
  for (const row of markup.inline_keyboard) {
    for (const button of row) {
      if (button.callback_data === undefined) {
        continue;
      }
      const params = counter.match(button.callback_data);
      if (params === null) {
        continue;
      }
      const page = Number(params[PAGINATE_PARAMS.page]);
      if (Number.isInteger(page) && page >= 0) {
        cursors[params[PAGINATE_PARAMS.section]] = page;
      }
    }
  }
  return cursors;
}
