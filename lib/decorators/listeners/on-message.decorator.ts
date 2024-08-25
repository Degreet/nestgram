import { Type } from '@nestjs/common';
import { Metadata } from '../../enums';
import { NestgramFilter } from '../../types/NestgramFilter';
import { ListenerOptions } from '../../types';

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

    return target;
  };
};
