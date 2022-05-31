import { IMessageEntity } from '../../types';

const argsProcedure: string[] = ['update', 'message', 'text', 'answer', 'entities'];

export function setupArguments(
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor,
): void {
  const method: any = descriptor.value;

  descriptor.value = function (): void {
    const data: any = Reflect.getOwnMetadata('gotIndex', target, propertyName);
    const startArguments: IArguments = { ...arguments };

    Object.values(data)
      .sort()
      .forEach((index: number): void => {
        const argKey: string = Object.keys(data).find(
          (key: string): boolean => data[key] === index,
        );

        if (argKey === 'entities') {
          const gotEntityTypes: any = Reflect.getOwnMetadata(
            'gotEntityTypes',
            target,
            propertyName,
          );

          if (gotEntityTypes) {
            Object.values(gotEntityTypes)
              .sort()
              .forEach((index: number): void => {
                const entities: IMessageEntity[] =
                  startArguments[
                    argsProcedure.findIndex((arg: string): boolean => arg === 'entities')
                  ];
                if (!entities) return (arguments[index.toString()] = null);

                const entity: IMessageEntity | undefined =
                  entities[
                    entities.findIndex(
                      (entity: IMessageEntity): boolean =>
                        entity.type ===
                        Object.keys(gotEntityTypes).find(
                          (key: string): boolean => gotEntityTypes[key] === index,
                        ),
                    )
                  ];
                if (!entity) return (arguments[index.toString()] = null);

                const text: string | undefined =
                  startArguments[argsProcedure.findIndex((key: string) => key === 'text')];
                if (!text) return (arguments[index.toString()] = null);

                const result: string = text.slice(entity.offset, entity.length);
                arguments[index.toString()] = { ...entity, result };
              });
          }
        } else {
          arguments[index.toString()] = startArguments[argsProcedure.indexOf(argKey)];
        }
      });

    return method.apply(this, arguments);
  };
}
