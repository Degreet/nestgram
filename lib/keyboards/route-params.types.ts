/**
 * A whole segment starting with `:` is a parameter (the runtime rule); any other
 * segment — including one with a mid-segment colon like `menu:open` — contributes none.
 */
type SegmentParam<Segment extends string> = Segment extends `:${infer Name}`
  ? Name
  : never;

/** The parameter names in a callback route template (`reminder/done/:id` → `'id'`). */
type RouteParamName<Template extends string> =
  Template extends `${infer Head}/${infer Tail}`
    ? SegmentParam<Head> | RouteParamName<Tail>
    : SegmentParam<Template>;

/** The values a route template requires: one key per `:param`. */
type RouteParams<Template extends string> = Record<
  RouteParamName<Template>,
  string | number
>;

/**
 * The trailing arguments a `.text()` callback button takes, conditioned on the
 * route template:
 *
 * - with `:params` — the values object is required, then an optional `hidden`
 *   flag (the framework assembles and escapes the route);
 * - without — just an optional `hidden` flag, so a plain or already-interpolated
 *   string (the terse `` `reminder/done/${id}` ``) needs no values argument.
 *
 * A param template passed without its values is a compile error, never silently
 * treated as raw `callback_data`.
 */
export type RouteParamArgs<Template extends string> = [
  RouteParamName<Template>,
] extends [never]
  ? [hidden?: boolean]
  : [params: RouteParams<Template>, hidden?: boolean];

/**
 * The trailing arguments a `Button.text()` value takes, conditioned on the route
 * template — like {@link RouteParamArgs} but without the `hidden` flag (a value
 * is either created or not; a keyboard drops it via `.map(...)`/conditionals):
 *
 * - with `:params` — the values object is required;
 * - without — nothing, so a plain or interpolated string needs no extra argument.
 */
export type RouteParamValues<Template extends string> = [
  RouteParamName<Template>,
] extends [never]
  ? []
  : [params: RouteParams<Template>];
