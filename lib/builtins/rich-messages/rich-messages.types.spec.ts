import { resolveRichMessagesSettings } from './rich-messages.types';
import { NestgramConfigError } from '../../exceptions';

describe('resolveRichMessagesSettings', () => {
  it('returns null when the option is absent', () => {
    expect(resolveRichMessagesSettings(undefined)).toBeNull();
  });

  it('resolves the default mode to "always"', () => {
    expect(resolveRichMessagesSettings({ dialect: 'markdown' })).toEqual({
      dialect: 'markdown',
      mode: 'always',
    });
  });

  it('keeps an explicit mode', () => {
    expect(
      resolveRichMessagesSettings({ dialect: 'html', mode: 'dynamic' }),
    ).toEqual({ dialect: 'html', mode: 'dynamic' });
  });

  it('rejects an unknown dialect', () => {
    expect(() =>
      resolveRichMessagesSettings({ dialect: 'bbcode' as never }),
    ).toThrow(NestgramConfigError);
  });

  it('rejects an unknown mode', () => {
    expect(() =>
      resolveRichMessagesSettings({
        dialect: 'markdown',
        mode: 'sometimes' as never,
      }),
    ).toThrow(NestgramConfigError);
  });
});
