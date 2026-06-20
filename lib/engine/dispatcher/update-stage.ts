import { TelegramExecutionContext } from '../context';
import { Metadata } from '../../decorators/metadata.enum';

/**
 * A step in the per-update pipeline, run inside the update's ambient scope before
 * routing. The framework's own per-update facilities (locale resolution, session
 * loading) are just stages — nothing privileged — so a bot author can drop in
 * their own (telemetry, per-user rate limiting, feature flags) by writing a
 * provider that implements this and is marked with {@link UpdateStage}.
 *
 * `apply` runs before matching, so anything it seeds into the ambient store
 * (`setAmbient`) is visible to guards, match predicates and the handler.
 * `commit` (optional) runs only after a handler returns successfully — skipped
 * when no route matched or the handler threw — which is where a stage persists
 * what the handler changed (sessions save here). Commits run in the same
 * (forward) order as `apply`, not reversed.
 */
export interface UpdateStage {
  apply(ctx: TelegramExecutionContext): void | Promise<void>;
  commit?(ctx: TelegramExecutionContext): void | Promise<void>;
}

/** Options for {@link UpdateStage} (the decorator). */
export interface UpdateStageOptions {
  /**
   * Ascending run order across all stages. Built-ins: i18n `10`, sessions `20`,
   * keyboard state `25`, FSM `30`, scenes `40`. User stages default to
   * {@link DEFAULT_STAGE_ORDER} (after the built-ins); ties keep discovery order.
   */
  order?: number;
}

/** Default order for a user stage — after the framework's built-in stages. */
export const DEFAULT_STAGE_ORDER = 1000;

/**
 * Run order of the framework's built-in stages, in one place. A user stage picks
 * an `order` relative to these (e.g. before i18n, or between i18n and sessions).
 */
export enum BuiltinStageOrder {
  I18n = 10,
  Session = 20,
  // After sessions: when keyboard state reuses the session store's backend, the
  // session config is already resolvable. Independent keyspace, so order is not
  // correctness-critical — just tidy.
  KeyboardState = 25,
  // Recovers paginated sections' page cursors from the incoming markup onto the
  // ambient rail, so any re-render (a toggle or a page tap) keeps each its page.
  PaginationCursors = 26,
  Fsm = 30,
  Scenes = 40,
}

interface StageMetadata {
  order: number;
}

/**
 * Marks an `@Injectable()` provider as an {@link UpdateStage}, discovered at boot
 * and run per update by the dispatcher. Pair with `implements UpdateStage`:
 *
 * ```ts
 * @Injectable()
 * @UpdateStage({ order: 50 })
 * export class AnalyticsStage implements UpdateStage {
 *   apply(ctx: TelegramExecutionContext) { ... }
 * }
 * ```
 */
export const UpdateStage = (
  options: UpdateStageOptions = {},
): ClassDecorator => {
  return (target) => {
    const metadata: StageMetadata = {
      order: options.order ?? DEFAULT_STAGE_ORDER,
    };
    Reflect.defineMetadata(Metadata.UPDATE_STAGE, metadata, target);
  };
};

/** The declared run order of an `@UpdateStage` class, or `undefined` if it isn't one. */
export function stageOrderOf(target: object): number | undefined {
  const metadata: StageMetadata | undefined = Reflect.getMetadata(
    Metadata.UPDATE_STAGE,
    target,
  );
  return metadata?.order;
}
