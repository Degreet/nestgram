import { RoutePredicate } from '../../engine/matching';
import { ListenerOptions } from '../listener-options';
import { Metadata } from '../../enums';

export const createListenerDecorator = (
  updateType: string,
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return (
    _target: object,
    _key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const existingMetadata: ListenerOptions[] | undefined = Reflect.getMetadata(
      Metadata.LISTENERS,
      descriptor.value,
    );

    const options: ListenerOptions = { updateType, predicates };

    const newMetadata = [...(existingMetadata ?? []), options];

    Reflect.defineMetadata(Metadata.LISTENERS, newMetadata, descriptor.value);

    // A method decorator must NOT return the target: a returned value becomes
    // the descriptor for the next decorator in a stack, which breaks stacking
    // (`@OnMessage() @OnCallbackQuery() handle()`). Return void.
  };
};
