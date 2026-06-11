import { Injectable, Logger } from '@nestjs/common';

import { RouteTable } from '../discovery';
import { UpdateKind } from '../context/update-kind';

/**
 * Decides which `allowed_updates` the transport asks Telegram for.
 *
 * With no explicit list the resolver derives one from the route table: exactly
 * the update kinds some handler listens to. That matters because Telegram holds
 * a few kinds back unless asked for them by name (`chat_member`,
 * `message_reaction`, `message_reaction_count`) — without a derived list, a
 * `@OnChatMember()` handler would simply never fire, with no error anywhere.
 *
 * An explicit list (polling `allowed_updates` / webhook `allowedUpdates`) is
 * passed through untouched, but every handler listening to a kind the list
 * omits gets a startup warning: Telegram will never deliver that kind, so the
 * handler is dead code.
 *
 * Resolution runs at transport start — after `NestgramBootstrap` filled the
 * route table, so the whole handler graph is visible.
 */
@Injectable()
export class AllowedUpdatesResolver {
  /**
   * Kinds Telegram never delivers unless requested by name. An *empty*
   * `allowed_updates` means "Telegram's default set" — everything except these.
   */
  private static readonly HELD_BACK_KINDS: ReadonlySet<string> = new Set([
    UpdateKind.ChatMember,
    UpdateKind.MessageReaction,
    UpdateKind.MessageReactionCount,
  ]);

  private readonly logger = new Logger(AllowedUpdatesResolver.name);

  constructor(private readonly routeTable: RouteTable) {}

  resolve(explicit?: readonly string[]): string[] {
    const listened = this.listenedKinds();

    if (explicit) {
      this.warnOnUncoveredKinds(listened, explicit);
      return [...explicit];
    }

    this.logger.log(
      `allowed_updates derived from handlers: [${listened.join(', ')}]`,
    );
    return listened;
  }

  /** Unique update kinds the route table has at least one handler for, sorted. */
  private listenedKinds(): string[] {
    const kinds = new Set<string>();
    for (const route of this.routeTable.all()) {
      kinds.add(route.updateType);
    }
    return [...kinds].sort();
  }

  private warnOnUncoveredKinds(
    listened: readonly string[],
    explicit: readonly string[],
  ): void {
    // `[]` is not "deliver nothing": Telegram reads an empty list as its
    // default set — every kind except the held-back ones.
    const isDefaultSet = explicit.length === 0;
    const allowed = new Set(explicit);

    for (const kind of listened) {
      const covered = isDefaultSet
        ? !AllowedUpdatesResolver.HELD_BACK_KINDS.has(kind)
        : allowed.has(kind);
      if (covered) {
        continue;
      }
      const handlers = this.routeTable
        .ofType(kind)
        .map(
          (route) => `${route.instance.constructor.name}.${route.methodName}`,
        )
        .join(', ');
      const omission = isDefaultSet
        ? `an empty allowed_updates means Telegram's default set, which excludes '${kind}'`
        : `allowed_updates does not include '${kind}'`;
      this.logger.warn(
        `${omission}, but ${handlers} listens to it — Telegram will never ` +
          `deliver '${kind}' updates, so the handler is dead. Add it to the ` +
          'list or drop the explicit allowed_updates to derive the list from ' +
          'your handlers.',
      );
    }
  }
}
