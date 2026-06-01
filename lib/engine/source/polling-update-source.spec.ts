import { BotService } from '../../api';
import { RawUpdate } from '../../types/raw-update.types';
import { BatchFetcher, PollingUpdateSource } from './polling-update-source';

function fakeBot(): BotService {
  return {
    deleteWebhook: jest.fn().mockResolvedValue(undefined),
    getMe: jest.fn().mockResolvedValue({ username: 'test_bot' }),
  } as unknown as BotService;
}

/** A listener that ignores updates — for tests that only assert loop control. */
const noop = (): void => undefined;

function msg(update_id: number): RawUpdate {
  return {
    update_id,
    message: { message_id: update_id, chat: { id: 1, type: 'private' } },
  };
}

/**
 * A fetcher that serves a scripted sequence of batches, one per call, then only
 * empty batches. Records the offset it was asked for each call.
 */
function scriptedFetcher(batches: RawUpdate[][]): {
  fetch: BatchFetcher;
  offsets: number[];
} {
  const offsets: number[] = [];
  let call = 0;
  const fetch: BatchFetcher = async (offset) => {
    offsets.push(offset);
    return batches[call++] ?? [];
  };
  return { fetch, offsets };
}

describe('PollingUpdateSource', () => {
  it('prepares the transport before polling (clear webhook + health check)', async () => {
    const bot = fakeBot();
    const { fetch } = scriptedFetcher([]);
    const source = new PollingUpdateSource(
      bot,
      { dropPendingUpdates: true },
      fetch,
    );

    await source.start(noop);
    await source.stop();

    expect(bot.deleteWebhook).toHaveBeenCalledWith({
      drop_pending_updates: true,
    });
    expect(bot.getMe).toHaveBeenCalledTimes(1);
  });

  it('emits each update in order', async () => {
    const { fetch } = scriptedFetcher([[msg(1), msg(2)], [msg(3)]]);
    const source = new PollingUpdateSource(fakeBot(), { idleMs: 1 }, fetch);

    const seen: number[] = [];
    await source.start((u) => {
      seen.push(u.update_id);
    });
    await waitFor(() => seen.length >= 3);
    await source.stop();

    expect(seen).toEqual([1, 2, 3]);
  });

  it('advances the offset to last update_id + 1 after a batch', async () => {
    const { fetch, offsets } = scriptedFetcher([[msg(10), msg(11)], [msg(12)]]);
    const source = new PollingUpdateSource(
      fakeBot(),
      { offset: 5, idleMs: 1 },
      fetch,
    );

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
    const fetch: BatchFetcher = async () => {
      call++;
      if (call === 1) throw new Error('network blip');
      if (call === 2) return [msg(1)];
      return [];
    };
    const source = new PollingUpdateSource(
      fakeBot(),
      { backoffMs: 1, idleMs: 1 },
      fetch,
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
    const bot = fakeBot();
    const { fetch } = scriptedFetcher([]);
    const source = new PollingUpdateSource(bot, {}, fetch);

    await source.start(noop);
    await source.start(noop);
    await source.stop();

    // prepare() ran only once despite two start() calls.
    expect(bot.getMe).toHaveBeenCalledTimes(1);
  });

  it('stop() resolves and halts the loop', async () => {
    const fetch: BatchFetcher = async () => [];
    const source = new PollingUpdateSource(fakeBot(), {}, fetch);

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
