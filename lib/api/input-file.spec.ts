import { createReadStream } from 'fs';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { InputFile } from './input-file';
import { CachedFile } from './cached-file';
import {
  createAttachedData,
  createInlineData,
  hasInputFile,
} from './form-data';

describe('InputFile', () => {
  it('a path infers its filename and MIME', async () => {
    const file = new InputFile('./pics/cat.png');
    expect(file.filename).toBe('cat.png');
    expect(file.cacheKey).toBeUndefined();
  });

  it('honors explicit filename/contentType overrides', () => {
    const file = new InputFile('./cat.png', {
      filename: 'kitty.png',
      contentType: 'image/x-custom',
    });
    expect(file.filename).toBe('kitty.png');
  });

  it('a buffer produces a Blob with the inferred MIME', async () => {
    const file = new InputFile(Buffer.from('hello'), { filename: 'a.png' });
    expect(file.filename).toBe('a.png');
    const blob = await file.toRaw();
    expect(blob.type).toBe('image/png');
    expect(await blob.text()).toBe('hello');
  });

  it('a buffer falls back to octet-stream for unknown extensions', async () => {
    const file = new InputFile(Buffer.from('x'), { filename: 'data.xyz' });
    expect((await file.toRaw()).type).toBe('application/octet-stream');
  });

  it('a buffer respects an explicit contentType', async () => {
    const file = new InputFile(Buffer.from('x'), {
      filename: 'data.bin',
      contentType: 'application/pdf',
    });
    expect((await file.toRaw()).type).toBe('application/pdf');
  });

  it('a buffer without a filename throws', () => {
    expect(
      () => new InputFile(Buffer.from('x') as Buffer, {} as never),
    ).toThrow(/filename/);
  });

  it('a stream infers the filename from the stream path and uploads its bytes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'nestgram-inputfile-'));
    const filePath = join(dir, 'note.txt');
    try {
      await writeFile(filePath, 'streamed');
      const file = new InputFile(createReadStream(filePath));
      expect(file.filename).toBe('note.txt');
      const blob = await file.toRaw();
      expect(await blob.text()).toBe('streamed');
      expect(blob.type).toBe('text/plain');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('CachedFile', () => {
  it('is an InputFile whose cacheKey is the path', () => {
    const file = new CachedFile('/assets/logo.png');
    expect(file).toBeInstanceOf(InputFile);
    expect(file.cacheKey).toBe('/assets/logo.png');
    expect(file.filename).toBe('logo.png');
  });

  it('uploads its bytes like any InputFile', async () => {
    // (built from a real temp file so toRaw can read it)
    const dir = await mkdtemp(join(tmpdir(), 'nestgram-cachedfile-'));
    const filePath = join(dir, 'logo.png');
    try {
      await writeFile(filePath, 'PNGDATA');
      const blob = await new CachedFile(filePath).toRaw();
      expect(await blob.text()).toBe('PNGDATA');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('form-data', () => {
  describe('hasInputFile (the multipart gate)', () => {
    it('is true when an InputFile is present', () => {
      expect(
        hasInputFile({
          photo: new InputFile(Buffer.from('x'), { filename: 'a.jpg' }),
        }),
      ).toBe(true);
    });

    it('is false for bare strings (remote refs)', () => {
      expect(hasInputFile({ photo: 'https://x/c.jpg' })).toBe(false);
      expect(hasInputFile({ photo: 'file_id' })).toBe(false);
    });

    it('finds a file nested in a media array', () => {
      expect(
        hasInputFile({
          media: [
            { type: 'photo', media: 'file_id' },
            {
              type: 'photo',
              media: new InputFile(Buffer.from('x'), { filename: 'b.jpg' }),
            },
          ],
        }),
      ).toBe(true);
    });
  });

  describe('createInlineData (flat, single-file)', () => {
    it('appends an uploaded blob with its filename', async () => {
      const form = await createInlineData({
        chat_id: 1,
        photo: new InputFile(Buffer.from('bytes'), { filename: 'cat.jpg' }),
      });
      const photo = form.get('photo');
      expect(typeof photo).not.toBe('string');
      expect((photo as File).name).toBe('cat.jpg');
    });

    it('appends a bare remote string as-is', async () => {
      const form = await createInlineData({
        chat_id: 1,
        photo: 'https://example.com/cat.jpg',
      });
      expect(form.get('photo')).toBe('https://example.com/cat.jpg');
    });
  });

  describe('createAttachedData (nested media)', () => {
    it('inlines remote strings and attach://-references uploads', async () => {
      const form = await createAttachedData({
        media: [
          { type: 'photo', media: 'https://example.com/a.jpg' },
          {
            type: 'photo',
            media: new InputFile(Buffer.from('x'), { filename: 'b.jpg' }),
          },
        ],
      });
      const media = JSON.parse(form.get('media') as string);
      expect(media[0].media).toBe('https://example.com/a.jpg');
      expect(media[1].media).toMatch(/^attach:\/\//);
    });
  });
});
