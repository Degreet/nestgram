import { RoutePredicate } from '../../engine/matching';
import { ListenerOptions } from '../listener-options';
import { Metadata } from '../metadata.enum';
import { Event } from '../params/event.decorator';
import { ensureFirstParamDecorated } from './ensure-first-param';

export const createListenerDecorator = (
  updateType: string,
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const existingMetadata: ListenerOptions[] | undefined = Reflect.getMetadata(
      Metadata.LISTENERS,
      descriptor.value,
    );

    const options: ListenerOptions = { updateType, predicates };

    const newMetadata = [...(existingMetadata ?? []), options];

    Reflect.defineMetadata(Metadata.LISTENERS, newMetadata, descriptor.value);

    // Author writes a bare typed first arg (`handle(message: Message)`) and
    // still receives the event.
    ensureFirstParamDecorated(target, key, descriptor, Event());

    // A method decorator must return void: a returned value becomes the
    // descriptor for the next decorator in a stack, which breaks stacking
    // (`@OnMessage() @OnCallbackQuery() handle()`).
  };
};
