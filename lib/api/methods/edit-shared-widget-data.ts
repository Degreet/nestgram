import { ApiMethod } from './api-method';

export interface EditSharedWidgetDataOptions {
  widget_id: string;
  public_data: string;
  cache_time?: number;
}

/**
 * Use this method to edit public data of a shared widget created by the bot. A shared widget can be edited at most once per second. On success, True is returned.
 * @see https://core.telegram.org/bots/api#editsharedwidgetdata
 */
export class EditSharedWidgetData extends ApiMethod<
  EditSharedWidgetDataOptions,
  true
> {
  readonly method = 'editSharedWidgetData';

  constructor(payload: EditSharedWidgetDataOptions) {
    super(payload);
  }
}
