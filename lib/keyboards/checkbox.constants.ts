/**
 * The callback-route namespace a {@link CheckboxKeyboard} owns. Shared by the
 * keyboard (which builds the routes into its buttons) and the built-in checkbox
 * router (which matches them), so the two never drift — the one place the
 * `checkbox/<id>/…` contract lives.
 */
export const CHECKBOX_TOGGLE_ROUTE = 'checkbox/:cb/toggle/:item';

/**
 * The `:param` names inside the routes above — referenced where the keyboard
 * fills them and where the router reads them, so a rename can't desync the two.
 */
export const CHECKBOX_PARAMS = { cb: 'cb', item: 'item' } as const;

/** Prefix under which the zero-config default persists a selection in the session. */
export const CHECKBOX_SESSION_PREFIX = 'checkbox:';
