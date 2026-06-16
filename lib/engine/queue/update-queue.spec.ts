import { Logger } from '@nestjs/common';

import { RawUpdate } from '../../events/raw-update.types';
import { NestgramConfigError } from '../../exceptions';
import { UpdateQueue } from './update-queue';

const flush = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

const msg = (chatId: number): RawUpdate =>
  ({ update_id: chatId, message: { chat: { id: chatId } } } as RawUpdate);

/**
 * A dispatch whose start is recorded immediately and whose completion is held
 * until its returned `finish` is called — so a test can pin the exact order of
 * starts and ends across serialized/parallel updates.
 */
function gatedDispatch(order: string[], id: string) {
  let finish!: () => void;
  const dispatch = (): Promise<void> =>
    new Promise<void>((resolve) => {
      order.push(`start:${id}`);
      finish = () => {
        order.push(`end:${id}`);
        resolve();
      };
    });
  return { dispatch, finish: () => finish() };
}

describe('UpdateQueue', () => {
  it.each([0, -1, 1.5, Infinity, NaN])(
    'rejects a non-positive-integer maxConcurrency (%p)',
    (maxConcurrency) => {
      expect(() => new UpdateQueue({ maxConcurrency })).toThrow(
        NestgramConfigError,
      );
    },
  );

  it('serializes updates for the same chat in arrival order (FIFO)', async () => {
    const queue = new UpdateQueue();
    const order: string[] = [];
    const a = gatedDispatch(order, 'a');
    const b = gatedDispatch(order, 'b');

    void queue.enqueue(msg(1), a.dispatch);
    void queue.enqueue(msg(1), b.dispatch);
    await flush();

    // Second same-chat update must wait — only the first has started.
    expect(order).toEqual(['start:a']);

    a.finish();
    await flush();
    expect(order).toEqual(['start:a', 'end:a', 'start:b']);

    b.finish();
    await flush();
    expect(order).toEqual(['start:a', 'end:a', 'start:b', 'end:b']);
  });

  it('runs updates for different chats in parallel', async () => {
    const queue = new UpdateQueue();
    const order: string[] = [];
    const a = gatedDispatch(order, 'a');
    const b = gatedDispatch(order, 'b');

    void queue.enqueue(msg(1), a.dispatch);
    void queue.enqueue(msg(2), b.dispatch);
    await flush();

    expect(order).toEqual(['start:a', 'start:b']);
    expect(queue.active).toBe(2);
  });

  it('resolves enqueue at admission, before the handler finishes', async () => {
    const queue = new UpdateQueue();
    let finished = false;
    let finish!: () => void;

    const admitted = queue.enqueue(
      msg(1),
      () =>
        new Promise<void>((resolve) => {
          finish = () => {
            finished = true;
            resolve();
          };
        }),
    );

    await admitted;
    // Admitted (slot acquired, dispatch started) but the handler has not completed.
    expect(finished).toBe(false);

    finish();
  });

  it('bounds concurrency and backpressures the next update until a slot frees', async () => {
    const queue = new UpdateQueue({ maxConcurrency: 1 });
    const order: string[] = [];
    const a = gatedDispatch(order, 'a');
    const b = gatedDispatch(order, 'b');

    await queue.enqueue(msg(1), a.dispatch); // admitted, holds the only slot
    void queue.enqueue(msg(2), b.dispatch); // different chat, but no slot free
    await flush();

    expect(order).toEqual(['start:a']);
    expect(queue.active).toBe(1);
    expect(queue.waiting).toBe(1);

    a.finish();
    await flush();
    expect(order).toEqual(['start:a', 'end:a', 'start:b']);

    b.finish();
  });

  it('dispatches chat-less updates concurrency-bounded but unserialized', async () => {
    const queue = new UpdateQueue();
    const order: string[] = [];
    const a = gatedDispatch(order, 'a');
    const b = gatedDispatch(order, 'b');

    // poll_answer carries no chat → no serialization key.
    const pollUpdate = { update_id: 1, poll_answer: {} } as RawUpdate;
    void queue.enqueue(pollUpdate, a.dispatch);
    void queue.enqueue({ ...pollUpdate, update_id: 2 }, b.dispatch);
    await flush();

    expect(order).toEqual(['start:a', 'start:b']);
  });

  it('keeps the per-chat chain alive when a dispatch throws', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const queue = new UpdateQueue();
    const order: string[] = [];
    const after = gatedDispatch(order, 'after');

    void queue.enqueue(msg(1), () => Promise.reject(new Error('boom')));
    void queue.enqueue(msg(1), after.dispatch);
    await flush();

    // The failing dispatch did not wedge the chat's chain.
    expect(order).toEqual(['start:after']);
    expect(Logger.prototype.error).toHaveBeenCalledTimes(1);

    after.finish();
    jest.restoreAllMocks();
  });

  it('drain() resolves only after in-flight dispatches finish', async () => {
    const queue = new UpdateQueue();
    const order: string[] = [];
    const a = gatedDispatch(order, 'a');
    const b = gatedDispatch(order, 'b'); // different chat, runs in parallel

    void queue.enqueue(msg(1), a.dispatch);
    void queue.enqueue(msg(2), b.dispatch);
    await flush();

    let drained = false;
    const draining = queue.drain().then(() => {
      drained = true;
    });

    await flush();
    expect(drained).toBe(false); // both still running

    a.finish();
    await flush();
    expect(drained).toBe(false); // b still running

    b.finish();
    await draining;
    expect(drained).toBe(true);
  });

  it('drops a key from the table once its chain drains', async () => {
    const queue = new UpdateQueue();
    const order: string[] = [];
    const a = gatedDispatch(order, 'a');

    void queue.enqueue(msg(1), a.dispatch);
    await flush();
    a.finish();
    await flush();

    // No work in flight — a fresh same-chat update starts immediately, proving
    // the chain wasn't left dangling.
    const order2: string[] = [];
    const c = gatedDispatch(order2, 'c');
    void queue.enqueue(msg(1), c.dispatch);
    await flush();
    expect(order2).toEqual(['start:c']);
    c.finish();
  });
});
