import { ISchemaOptionParams } from '../../types/schema.types';
import { schemaStore } from '../../classes/Mongo/SchemaStore';

export function Prop(options?: ISchemaOptionParams): PropertyDecorator {
  return (target: any, key: string): void => {
    const type: any = Reflect.getMetadata('design:type', target, key);

    const data: ISchemaOptionParams = {
      type,
      ...options,
    };

    schemaStore.saveProperty({
      target: target.constructor,
      propertyKey: key,
      options: data,
    });
  };
}
