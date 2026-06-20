import { Logger, Optional, ParseIntPipe } from '@nestjs/common';

import { setAmbient } from '../../ambient';
import { CallbackRoutePattern } from '../../callback-data';
import { Router } from '../../decorators/injectable/router.decorator';
import { Action } from '../../decorators/listeners/action.decorator';
import { Param } from '../../decorators/params/param.decorator';
import { KeyboardRenderRegistry } from '../../engine/discovery';
import { CallbackQuery } from '../../events/callback-query';
import type { RawInlineKeyboardMarkup } from '../../events/raw-update.types';
import type { InlineKeyboard } from '../../keyboards';
import {
  PAGINATE_AT_ROUTE,
  PAGINATE_GO_ROUTE,
  PAGINATE_PARAMS,
  PAGINATION_CURSORS,
} from '../../keyboards/pagination.constants';

/**
 * Drives every `InlineKeyboard.paginate(id, …)` section: a tap on a nav control
 * routes here, the cursor of each section is recovered (the tapped one from the
 * callback, the others from the `pageat` counters in the incoming markup), and the
 * keyboard is rebuilt through the group's `@KeyboardRender` builder so the markup
 * is edited in place — no nav handler for the bot author.
 *
 * The cursor lives in the keyboard's callback-data, not a store: it is recovered
 * fresh each tap, so pagination survives a restart and never needs persistence.
 * A plain `@Router` a user could have written. A paginated keyboard with no
 * builder can't re-render (the page is fixed once rendered) — a logged no-op.
 */
@Router()
export class PaginationRouter {
  private readonly logger = new Logger('Pagination');

  // `@Optional()`: absent in unit-built routers; the registry is filled at boot.
  constructor(
    @Optional() private readonly renderers?: KeyboardRenderRegistry,
  ) {}

  // prev/next: navigate the tapped section to `page`, preserving the others.
  @Action(PAGINATE_GO_ROUTE)
  go(
    query: CallbackQuery,
    @Param(PAGINATE_PARAMS.section) section: string,
    @Param(PAGINATE_PARAMS.page, ParseIntPipe) page: number,
  ): Promise<InlineKeyboard | void> {
    return this.navigate(query, section, page);
  }

  // The counter is inert — tapping it re-renders the page it already shows.
  @Action(PAGINATE_AT_ROUTE)
  at(
    query: CallbackQuery,
    @Param(PAGINATE_PARAMS.section) section: string,
    @Param(PAGINATE_PARAMS.page, ParseIntPipe) page: number,
  ): Promise<InlineKeyboard | void> {
    return this.navigate(query, section, page);
  }

  private async navigate(
    query: CallbackQuery,
    section: string,
    page: number,
  ): Promise<InlineKeyboard | void> {
    const renderer = this.renderers?.get(section);
    if (renderer === undefined) {
      this.logger.warn(
        `Pagination section "${section}" has no @KeyboardRender builder, so the ` +
          'tap cannot re-render. Declare one (the page changes by rebuilding).',
      );
      return;
    }
    const cursors = this.readCursors(query.message?.reply_markup);
    cursors[section] = page; // the tapped section overrides its recovered page
    setAmbient(PAGINATION_CURSORS, cursors);
    return renderer();
  }

  /**
   * Recover each section's current page from the incoming markup's `pageat`
   * counters — the keyboard describes its own cursors, so the page of every
   * section other than the tapped one is preserved across a re-render.
   */
  private readCursors(
    markup: RawInlineKeyboardMarkup | undefined,
  ): Record<string, number> {
    const cursors: Record<string, number> = {};
    if (markup === undefined) {
      return cursors;
    }
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
}
