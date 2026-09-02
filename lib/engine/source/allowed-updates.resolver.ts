import { Injectable, Logger } from '@nestjs/common';

import { RouteTable } from '../discovery';
import { UpdateKind } from '../context/update-kind';
import { StageRegistry } from '../dispatcher/stage-registry';

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

  constructor(
    private readonly routeTable: RouteTable,
    private readonly stages: StageRegistry,
  ) {}

  resolve(explicit?: readonly string[]): string[] {
    const listened = this.listenedKinds();

    if (explicit) {
      this.warnOnUncoveredKinds(listened, explicit);
      this.warnOnUncoveredStageKinds(explicit);
      return [...explicit];
    }

    const derived = [
      ...new Set([...listened, ...this.stages.declaredKinds()]),
    ].sort();
    this.logger.log(
      `allowed_updates derived from handlers: [${derived.join(', ')}]`,
    );
    return derived;
  }

  /**
   * Unique update kinds the route table has at least one handler for, sorted.
   * User handlers only — {@link STAGE_KINDS} is added to the derived list but
   * deliberately kept out of here, since the dead-handler warning below has no
   * handler to name for a kind nothing routes.
   */
  private listenedKinds(): string[] {
    const kinds = new Set<string>();
    for (const route of this.routeTable.all()) {
      kinds.add(route.updateType);
    }
    return [...kinds].sort();
  }

  /**
   * A stage kind an explicit list omits.
   *
   * Separate from the handler warning because there IS no handler to name — the
   * feature behind the stage just goes quiet. Left out of that loop rather than
   * folded in so neither message has to hedge about which case it is. The
   * explicit list itself is never rewritten: taking manual control is the point
   * of passing one.
   */
  private warnOnUncoveredStageKinds(explicit: readonly string[]): void {
    if (explicit.length === 0) {
      // Telegram's default set covers every kind a stage consumes today; the
      // held-back ones are all route-bound.
      return;
    }
    const allowed = new Set(explicit);
    for (const kind of this.stages.declaredKinds()) {
      if (allowed.has(kind)) {
        continue;
      }
      this.logger.warn(
        `allowed_updates does not include '${kind}', which a built-in pipeline ` +
          'stage consumes — Telegram will never deliver it, so the feature ' +
          'behind it goes silent (for stopped_message_generation that is the ' +
          'stop button on a canStop stream). Add it to the list, or drop the ' +
          'explicit allowed_updates to derive the list automatically.',
      );
    }
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
