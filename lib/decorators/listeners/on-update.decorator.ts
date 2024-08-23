import { Metadata } from '../../enums';

export const OnUpdate = (): MethodDecorator => {
  return (target: any, _key: string, descriptor: PropertyDescriptor) => {
    const existingMetadata = Reflect.getMetadata(
      Metadata.LISTENERS,
      descriptor.value,
    );

    const newMetadata = [...(existingMetadata ?? []), {}];

    Reflect.defineMetadata(Metadata.LISTENERS, newMetadata, descriptor.value);

    return target;
  };
};
