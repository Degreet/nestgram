import { SendPhoto } from './send-photo';
import { SendMediaGroup } from './send-media-group';
import { InputFile } from '../input-file';

/**
 * Pins the multipart-transport signals (`hasMedia` / `isAttachMedia`) that
 * BotService.serialize keys off. They had zero coverage; the code generator
 * must reproduce these getters verbatim, so guard them before regenerating.
 */
describe('Method media flags', () => {
  describe('SendPhoto.hasMedia', () => {
    it('is true when the photo is an InputFile (needs multipart upload)', () => {
      const method = new SendPhoto({
        chat_id: 1,
        photo: new InputFile('photo.jpg'),
      });
      expect(method.hasMedia).toBe(true);
    });

    it('is false when the photo is a string (file_id / URL)', () => {
      const method = new SendPhoto({
        chat_id: 1,
        photo: 'https://example.com/p.jpg',
      });
      expect(method.hasMedia).toBe(false);
    });
  });

  describe('SendMediaGroup', () => {
    it('always marks isAttachMedia (nested files need attach:// references)', () => {
      const method = new SendMediaGroup({
        chat_id: 1,
        media: [{ type: 'photo', media: 'file_id' }],
      });
      expect(method.isAttachMedia).toBe(true);
    });

    it('hasMedia is true when any media entry carries an InputFile', () => {
      const method = new SendMediaGroup({
        chat_id: 1,
        media: [
          { type: 'photo', media: 'file_id' },
          { type: 'photo', media: new InputFile('p.jpg') },
        ],
      });
      expect(method.hasMedia).toBe(true);
    });

    it('hasMedia is false when every media entry is a string', () => {
      const method = new SendMediaGroup({
        chat_id: 1,
        media: [
          { type: 'photo', media: 'file_id_1' },
          { type: 'video', media: 'file_id_2' },
        ],
      });
      expect(method.hasMedia).toBe(false);
    });
  });
});
