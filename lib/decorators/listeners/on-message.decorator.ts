import { Metadata } from '../../enums';

export const OnMessage = (): MethodDecorator => {
  return (target: any, _key: string, descriptor: PropertyDescriptor) => {
    const existingMetadata = Reflect.getMetadata(
      Metadata.LISTENERS,
      descriptor.value,
    );

    const newMetadata = [
      ...(existingMetadata ?? []),
      { updateType: 'message' },
    ];

    Reflect.defineMetadata(Metadata.LISTENERS, newMetadata, descriptor.value);

    return target;
  };
};
