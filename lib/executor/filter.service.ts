import { Injectable } from '@nestjs/common';
import { ListenerOptions, NestgramFilter, UpdateObject } from '../types';
import { ExternalContextCreator, ModuleRef } from '@nestjs/core';

@Injectable()
export class FilterService {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly externalContextCreator: ExternalContextCreator,
  ) {}

  private executeFilter(instance: NestgramFilter, ...args: any[]) {
    return this.externalContextCreator.create(
      instance,
      instance.canActivate,
      instance.canActivate.name,
    )(...args);
  }

  public async passFilters(
    listeners: ListenerOptions[],
    updateObject: UpdateObject,
  ) {
    const args = [updateObject];

    for (const options of listeners) {
      if (options.updateType !== updateObject.updateTitle) continue;

      const result = await Promise.all(
        (options.filters ?? []).map(async (filter) => {
          const instance = this.moduleRef.get(filter);
          const result = this.executeFilter(instance, ...args);
          if (result instanceof Promise) await result;
          return result;
        }),
      );
      if (!result.every(Boolean)) continue;

      return true;
    }
  }
}
