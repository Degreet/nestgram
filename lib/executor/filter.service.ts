import { Injectable } from '@nestjs/common';
import { ListenerOptions, UpdateObject } from '../types';

@Injectable()
export class FilterService {
  public async passFilters(
    listeners: ListenerOptions[],
    updateObject: UpdateObject,
    data: any,
  ) {
    const args = [updateObject, data];

    for (const options of listeners) {
      if (options.updateType !== updateObject.updateTitle) continue;

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
