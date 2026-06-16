import { RawUpdate } from '../../events/raw-update.types';
import { UpdateListener, UpdateSource } from '../source/update-source';
import { QueuedUpdateSource } from './queued-update-source';
import { UpdateQueue } from './update-queue';

const flush = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

const msg = (chatId: number, id = chatId): RawUpdate =>
  ({ update_id: id, message: { chat: { id: chatId } } } as RawUpdate);

/** A fake inner source that captures the listener so a test can drive updates. */
class FakeSource implements UpdateSource {
  listener?: UpdateListener;
  stopped = false;
  async start(onUpdate: UpdateListener): Promise<void> {
    this.listener = onUpdate;
  }
  async stop(): Promise<void> {
    this.stopped = true;
  }
  deliver(update: RawUpdate): void | Promise<void> {
    return this.listener?.(update);
  }
}

describe('QueuedUpdateSource', () => {
  it('starts the inner source and routes its updates to the listener', async () => {
    const inner = new FakeSource();
    const seen: number[] = [];
    const source = new QueuedUpdateSource(inner, new UpdateQueue());

    await source.start((update) => {
      seen.push(update.update_id);
    });
    expect(inner.listener).toBeDefined();

    await inner.deliver(msg(1));
    await flush();

    expect(seen).toEqual([1]);
  });

  it('serializes same-chat updates through the queue', async () => {
    const inner = new FakeSource();
    const order: string[] = [];
    let releaseFirst!: () => void;

    const source = new QueuedUpdateSource(inner, new UpdateQueue());
    await source.start((update) => {
      order.push(`start:${update.update_id}`);
      if (update.update_id === 1) {
        return new Promise<void>((resolve) => {
          releaseFirst = () => {
            order.push('end:1');
            resolve();
          };
        });
      }
      return undefined;
    });

    void inner.deliver(msg(1, 1));
    void inner.deliver(msg(1, 2)); // same chat → must wait for #1
    await flush();
    expect(order).toEqual(['start:1']);

    releaseFirst();
    await flush();
    expect(order).toEqual(['start:1', 'end:1', 'start:2']);
  });

  it('on stop, stops the inner source first, then drains in-flight updates', async () => {
    const inner = new FakeSource();
    const queue = new UpdateQueue();
    const source = new QueuedUpdateSource(inner, queue);

    let finished = false;
    let release!: () => void;
    await source.start(
      () =>
        new Promise<void>((resolve) => {
          release = () => {
            finished = true;
            resolve();
          };
        }),
    );

    await inner.deliver(msg(1));
    await flush(); // admitted, dispatch running

    let stopped = false;
    const stopping = source.stop().then(() => {
      stopped = true;
    });
    await flush();

    expect(inner.stopped).toBe(true); // intake stopped first
    expect(stopped).toBe(false); // but stop() awaits the drain
    expect(finished).toBe(false);

    release();
    await stopping;
    expect(finished).toBe(true);
    expect(stopped).toBe(true);
  });
});
