import { RoutePredicate } from '../../matching';
import { ListenerOptions } from '../../types';
import { Metadata } from '../../enums';

export const createListenerDecorator = (
  updateType: string,
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return (target: any, _key: string, descriptor: PropertyDescriptor) => {
    const existingMetadata = Reflect.getMetadata(
      Metadata.LISTENERS,
      descriptor.value,
    );

    const options: ListenerOptions = { updateType, predicates };

    const newMetadata = [...(existingMetadata ?? []), options];

    Reflect.defineMetadata(Metadata.LISTENERS, newMetadata, descriptor.value);

    return target;
  };
};
