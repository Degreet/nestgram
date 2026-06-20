import { Logger, Optional, ParseIntPipe } from '@nestjs/common';

import { getAmbient, setAmbient } from '../../ambient';
import { Router } from '../../decorators/injectable/router.decorator';
import { Action } from '../../decorators/listeners/action.decorator';
import { Param } from '../../decorators/params/param.decorator';
import { KeyboardRenderRegistry } from '../../engine/discovery';
import type { InlineKeyboard } from '../../keyboards';
import {
  PAGINATE_AT_ROUTE,
  PAGINATE_GO_ROUTE,
  PAGINATE_PARAMS,
  PAGINATION_CURSORS,
} from '../../keyboards/pagination.constants';

/**
 * Drives every `InlineKeyboard.paginate(id, …)` section: a tap on a nav control
 * routes here, the tapped section's page overrides the cursor map the pagination
 * stage already recovered from the incoming markup, and the keyboard is rebuilt
 * through the group's `@KeyboardRender` builder — no nav handler for the author.
 * Every OTHER section keeps its page (recovered by the stage), so two paginations
 * are independent and a checkbox toggle re-render keeps its page too.
 *
 * The cursor lives in the keyboard's callback-data, not a store — restart/TTL-proof.
 * A plain `@Router`. A paginated keyboard with no builder can't re-render (the page
 * is fixed once rendered) — a logged no-op.
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
    @Param(PAGINATE_PARAMS.section) section: string,
    @Param(PAGINATE_PARAMS.page, ParseIntPipe) page: number,
  ): Promise<InlineKeyboard | void> {
    return this.navigate(section, page);
  }

  // The counter is inert — tapping it re-renders the page it already shows.
  @Action(PAGINATE_AT_ROUTE)
  at(
    @Param(PAGINATE_PARAMS.section) section: string,
    @Param(PAGINATE_PARAMS.page, ParseIntPipe) page: number,
  ): Promise<InlineKeyboard | void> {
    return this.navigate(section, page);
  }

  private async navigate(
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
    // The stage recovered every section's page; override just the tapped one.
    const cursors =
      getAmbient<Record<string, number>>(PAGINATION_CURSORS) ?? {};
    cursors[section] = page;
    setAmbient(PAGINATION_CURSORS, cursors);
    return renderer();
  }
}
