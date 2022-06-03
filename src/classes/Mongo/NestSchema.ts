import { ISchemaInfo, ISchemaOptionParams } from '../../types/schema.types';
import { error } from '../../logger';
import * as mongoose from 'mongoose';

export class NestSchema {
  static reg(schema: any): mongoose.Schema {
    const schemaInfo: ISchemaInfo = Reflect.getMetadata('schema', schema);
    if (!schemaInfo)
      throw error(`Can't find scheme info. Maybe you need to use @Schema() decorator?`);
    return new mongoose.Schema<ISchemaOptionParams[]>(schemaInfo.options);
  }
}
