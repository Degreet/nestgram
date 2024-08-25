import { Type } from '@nestjs/common';

import { Metadata } from '../../enums';
import { ListenerOptions, NestgramFilter } from '../../types';

export const usedFilters: Type<NestgramFilter>[] = [];

export const OnMessage = (
  ...filters: Type<NestgramFilter>[]
): MethodDecorator => {
  return (target: any, _key: string, descriptor: PropertyDescriptor) => {
    const existingMetadata = Reflect.getMetadata(
      Metadata.LISTENERS,
      descriptor.value,
    );

    const options: ListenerOptions = { updateType: 'message', filters };

    const newMetadata = [...(existingMetadata ?? []), options];

    Reflect.defineMetadata(Metadata.LISTENERS, newMetadata, descriptor.value);

    if (filters) {
      usedFilters.push(...filters);
    }

    return target;
  };
};
