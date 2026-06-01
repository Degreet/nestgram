import { InputFile } from './input-file';

/**
 * Build the `multipart/form-data` body for Telegram API methods that carry
 * files. Pure transforms (payload -> FormData) with no state or dependencies,
 * called by `ApiMethod` — which is a `new`-ed value object, not a DI provider —
 * so this is a small module of functions, not an injectable service.
 */

/** A random `attach://` id for a file part. */
function getFileId(): string {
  return Math.random().toString(36).substring(2);
}

/**
 * Flat form-data: each field is appended directly; `InputFile` values become
 * raw file parts, other objects are JSON-stringified. Used by single-file
 * methods (e.g. `sendPhoto`).
 */
export async function createInlineData(
  payload: Record<string, unknown>,
): Promise<FormData> {
  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (!value) {
      continue;
    }
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

/**
 * Nested form-data: objects are walked recursively and any `InputFile` is
 * replaced by an `attach://<id>` reference plus its own file part. Used by
 * methods whose files are nested inside the payload (e.g. `sendMediaGroup`).
 */
export async function createAttachedData(
  payload: Record<string, unknown>,
): Promise<FormData> {
  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (!value) {
      continue;
    }
    if (typeof value === 'object') {
      const serialized = await serializeObject(value, formData);
      formData.append(key, JSON.stringify(serialized));
    } else {
      formData.append(key, String(value));
    }
  }

  return formData;
}

/** Recursively replace `InputFile`s with `attach://` refs, appending parts. */
async function serializeObject(
  value: unknown,
  formData: FormData,
): Promise<unknown> {
  if (!value) {
    return value;
  }

  if (value instanceof InputFile) {
    const id = getFileId();
    formData.append(id, await value.toRaw(), value.filename);
    return `attach://${id}`;
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => serializeObject(item, formData)));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = await serializeObject(nested, formData);
    }
    return result;
  }

  return value;
}
