import { Update } from './Update';
import { Filter } from './Filter';

export type Handler = (update: Update) => Promise<unknown> | unknown;

export interface HandlerObject {
  filters: Filter[];
  handler: Handler;
}
