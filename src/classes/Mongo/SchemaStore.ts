import { ISchemaOptionParams, ISchemaOptions } from '../../types/schema.types';

class SchemaStore {
  private properties: ISchemaOptions[] = [];

  saveProperty(newProperty: ISchemaOptions): void {
    this.properties.push(newProperty);
  }

  getSchemaProperties(target: any): ISchemaOptionParams[] {
    const schemaOptions: ISchemaOptions[] = this.properties.filter(
      (options: ISchemaOptions): boolean => options.target === target,
    );

    return schemaOptions.map((options: ISchemaOptions): ISchemaOptionParams => options.options);
  }
}

export const schemaStore: SchemaStore = new SchemaStore();
