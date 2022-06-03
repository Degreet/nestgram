export interface ISchemaOptionParams {
  type?: any;
  required?: boolean;
  default?: any;
}

export interface ISchemaOptions {
  target: any;
  propertyKey: string;
  options: ISchemaOptionParams;
}

export interface ISchemaParams {
  name?: string;
  collectionName?: string;
}

export interface ISchemaInfo extends ISchemaParams {
  options: ISchemaOptionParams[];
}
