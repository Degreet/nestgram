import { NestgramFilter } from '../types';
import { CallbackQuery } from '../updateObjects';

export class CallbackQueryDataFilter implements NestgramFilter {
  constructor(private readonly data?: string | RegExp) {}

  canActivate(callbackQuery: CallbackQuery): boolean {
    if (!this.data) {
      return true;
    }
    if (this.data instanceof RegExp) {
      return this.data.test(callbackQuery.data);
    }
    return callbackQuery.data === this.data;
  }
}
