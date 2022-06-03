import mongoose from 'mongoose';
import { success } from '../logger';

export function UseMongoConnection(uri: string) {
  return async (): Promise<void> => {
    await mongoose.connect(uri);
    mongoose.connection.on('error', console.error);
    success('Mongoose connected');
  };
}
