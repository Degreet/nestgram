import { Type } from '@nestjs/common';
import { ListenerOptions, NestgramFilter } from '../../types';
import { Metadata } from '../../enums';
import { usedFilters } from './usedFilters';

export const createListenerDecorator = (
  updateType: string,
  ...filters: Type<NestgramFilter>[]
): MethodDecorator => {
  return (target: any, _key: string, descriptor: PropertyDescriptor) => {
    const existingMetadata = Reflect.getMetadata(
      Metadata.LISTENERS,
      descriptor.value,
    );

    const options: ListenerOptions = { updateType, filters };

    const newMetadata = [...(existingMetadata ?? []), options];

    Reflect.defineMetadata(Metadata.LISTENERS, newMetadata, descriptor.value);

    usedFilters.push(...filters);

    return target;
  };
};
