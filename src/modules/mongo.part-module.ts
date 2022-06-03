import { ISchemaInfo, ISchemaOptionParams } from '../types/schema.types';
import { error } from '../logger';
import mongoose from 'mongoose';

export function UseMongo(...schemas: any[]) {
  return (): mongoose.Model<ISchemaOptionParams[]>[] => {
    const result: mongoose.Model<ISchemaOptionParams[]>[] = [];

    for (const schema of schemas) {
      const schemaInfo: ISchemaInfo = Reflect.getMetadata('schema', schema);
      if (!schemaInfo) throw error(`Can't get schema info. Check you are giving schema`);

      result.push(
        mongoose.model<ISchemaOptionParams[]>(
          schemaInfo.name,
          new mongoose.Schema<ISchemaOptionParams[]>(schemaInfo.options),
        ),
      );
    }

    return result;
  };
}
