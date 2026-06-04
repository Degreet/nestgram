import { BotService } from '../../api';
import { RawUpdate } from '../../events/raw-update.types';
import { PollingOptions, PollingUpdateSource } from './polling-update-source';

/** A listener that ignores updates — for tests that only assert loop control. */
const noop = (): void => undefined;

function msg(update_id: number): RawUpdate {
  return {
    update_id,
    message: {
      message_id: update_id,
      date: 1,
      chat: { id: 1, type: 'private' },
    },
  };
}

interface Harness {
  source: PollingUpdateSource;
  bot: BotService;
  offsets: number[];
}

/**
 * Build a source whose `bot.getUpdates` serves a scripted sequence of batches
 * (one per call, then only empty batches) and records the offset asked for.
 */
function harness(
  polling: PollingOptions,
  batches: RawUpdate[][] = [],
): Harness {
  const offsets: number[] = [];
  let call = 0;
  const bot = {
    deleteWebhook: jest.fn().mockResolvedValue(undefined),
    getMe: jest.fn().mockResolvedValue({ username: 'test_bot' }),
    getUpdates: jest.fn(async (options: { offset?: number }) => {
      offsets.push(options.offset ?? 0);
      return batches[call++] ?? [];
    }),
  } as unknown as BotService;

  const source = new PollingUpdateSource({ token: 't', polling }, bot);
  return { source, bot, offsets };
}

describe('PollingUpdateSource', () => {
  it('prepares the transport before polling (clears the webhook)', async () => {
    const { source, bot } = harness({ dropPendingUpdates: true });

    await source.start(noop);
    await source.stop();

    expect(bot.deleteWebhook).toHaveBeenCalledWith({
      drop_pending_updates: true,
    });
    // Identity/health (getMe) is warmed by NestgramBootstrap, not the source.
    expect(bot.getMe).not.toHaveBeenCalled();
  });

  it('emits each update in order', async () => {
    const { source } = harness({ idleMs: 1 }, [[msg(1), msg(2)], [msg(3)]]);

    const seen: number[] = [];
    await source.start((u) => {
      seen.push(u.update_id);
    });
    await waitFor(() => seen.length >= 3);
    await source.stop();

    expect(seen).toEqual([1, 2, 3]);
  });

  it('advances the offset to last update_id + 1 after a batch', async () => {
    const { source, offsets } = harness({ offset: 5, idleMs: 1 }, [
      [msg(10), msg(11)],
      [msg(12)],
    ]);

    const seen: number[] = [];
    await source.start((u) => {
      seen.push(u.update_id);
    });
    await waitFor(() => seen.length >= 3);
    await source.stop();

    // first fetch at the initial offset, then past each acknowledged batch.
    expect(offsets.slice(0, 3)).toEqual([5, 12, 13]);
  });

  it('keeps polling after a failed fetch instead of dying', async () => {
    let call = 0;
    const bot = {
      deleteWebhook: jest.fn().mockResolvedValue(undefined),
      getMe: jest.fn().mockResolvedValue({ username: 'test_bot' }),
      getUpdates: jest.fn(async () => {
        call++;
        if (call === 1) throw new Error('network blip');
        if (call === 2) return [msg(1)];
        return [];
      }),
    } as unknown as BotService;
    const source = new PollingUpdateSource(
      { token: 't', polling: { backoffMs: 1, idleMs: 1 } },
      bot,
    );

    const seen: number[] = [];
    await source.start((u) => {
      seen.push(u.update_id);
    });
    await waitFor(() => seen.length >= 1);
    await source.stop();

    expect(seen).toEqual([1]);
  });

  it('is idempotent: a second start() is ignored while running', async () => {
    const { source, bot } = harness({});

    await source.start(noop);
    await source.start(noop);
    await source.stop();

    expect(bot.deleteWebhook).toHaveBeenCalledTimes(1);
  });

  it('stop() resolves and halts the loop', async () => {
    const { source } = harness({});

    await source.start(noop);
    await expect(source.stop()).resolves.toBeUndefined();
  });
});

/** Poll a predicate until true (or time out), yielding to the event loop. */
async function waitFor(pred: () => boolean, timeoutMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!pred()) {
    if (Date.now() > deadline) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 1));
  }
}
