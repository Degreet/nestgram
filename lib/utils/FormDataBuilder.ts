import { InputFile } from '../api/input-file';

export class FormDataBuilder {
  static getFileId() {
    return Math.random().toString(36).substring(2);
  }

  static async createInlineData(payload: any): Promise<FormData> {
    const formData = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      if (!value) continue;
      if (value instanceof InputFile) {
        formData.append(key, await value.toRaw());
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
    return formData;
  }

  static async createAttachedData(payload: any): Promise<FormData> {
    const formData = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      if (!value) continue;
      if (typeof value === 'object') {
        const serialized = await this.serializeObject(value, formData);
        formData.append(key, JSON.stringify(serialized));
      } else {
        formData.append(key, String(value));
      }
    }
    return formData;
  }

  static async serializeObject(object: any, formData: FormData) {
    if (!object) return;

    if (object instanceof InputFile) {
      const id = this.getFileId();
      const file = await object.toRaw();
      formData.append(id, file, object.filename);
      return `attach://${id}`;
    }

    if (Array.isArray(object)) {
      return Promise.all(
        object.map((object) => this.serializeObject(object, formData)),
      );
    }

    if (typeof object === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(object)) {
        result[key] = await this.serializeObject(value, formData);
      }
      return result;
    }

    return object;
  }
}
