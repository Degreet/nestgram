import { Logger } from '@nestjs/common';

import { WebhookUpdateSource } from './webhook-update-source';
import { BotService } from '../../api';
import { NestgramModuleOptions } from '../../module/nestgram-module.types';
import { RawUpdate } from '../../events/raw-update.types';

function make(webhook: NestgramModuleOptions['webhook'], token = '123:ABC') {
  const setWebhook = jest.fn().mockResolvedValue(true);
  const deleteWebhook = jest.fn().mockResolvedValue(true);
  const bot = { token, setWebhook, deleteWebhook } as unknown as BotService;
  const source = new WebhookUpdateSource(
    { token, webhook } as NestgramModuleOptions,
    bot,
  );
  return { source, setWebhook, deleteWebhook };
}

describe('WebhookUpdateSource', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers the webhook with the secret token on start', async () => {
    const { source, setWebhook } = make({
      url: 'https://x/telegram/webhook',
      secretToken: 's3cret',
    });
    await source.start(() => undefined);
    expect(setWebhook).toHaveBeenCalledWith('https://x/telegram/webhook', {
      secret_token: 's3cret',
    });
  });

  it('warns when no secretToken is set', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    await make({ url: 'https://x/telegram/webhook' }).source.start(
      () => undefined,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('secretToken'));
  });

  it('warns when the bot token appears in the URL', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    await make({
      url: 'https://x/123:ABC/hook',
      secretToken: 's',
    }).source.start(() => undefined);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('bot token'));
  });

  it('verifySecret matches the configured secret', () => {
    const { source } = make({ url: 'https://x/h', secretToken: 's3cret' });
    expect(source.verifySecret('s3cret')).toBe(true);
    expect(source.verifySecret('nope')).toBe(false);
    expect(source.verifySecret(undefined)).toBe(false);
  });

  it('verifySecret accepts anything when no secret is configured', () => {
    const { source } = make({ url: 'https://x/h' });
    expect(source.verifySecret(undefined)).toBe(true);
    expect(source.verifySecret('whatever')).toBe(true);
  });

  it('warns when the URL path does not match the served route', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    await make({ url: 'https://x/wrong-path', secretToken: 's' }).source.start(
      () => undefined,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('telegram/webhook'),
    );
  });

  it('deliver forwards the update to the listener set in start', async () => {
    const { source } = make({
      url: 'https://x/telegram/webhook',
      secretToken: 's',
    });
    const seen: number[] = [];
    await source.start((u) => {
      seen.push(u.update_id);
    });
    await source.deliver({ update_id: 7 } as RawUpdate);
    expect(seen).toEqual([7]);
  });

  it('deletes the webhook on stop', async () => {
    const { source, deleteWebhook } = make({
      url: 'https://x/h',
      secretToken: 's',
    });
    await source.stop();
    expect(deleteWebhook).toHaveBeenCalled();
  });
});
