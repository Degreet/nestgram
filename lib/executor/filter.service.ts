import { Injectable } from '@nestjs/common';
import { ListenerOptions, Update } from '../types';

@Injectable()
export class FilterService {
  public async passFilters(
    listeners: ListenerOptions[],
    update: Update,
    data: any,
  ) {
    const args = [update._telegramObject, data];

    for (const options of listeners) {
      if (options.updateType !== update._updateType) continue;

      const result = await Promise.all(
        (options.filters ?? []).map(async (filter) => {
          const result = filter.canActivate(...args);
          if (result instanceof Promise) await result;
          return result;
        }),
      );
      if (!result.every(Boolean)) continue;

      return true;
    }
  }
}
