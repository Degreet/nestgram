import type { UpdateListener, UpdateSource } from '../source/update-source';
import { UpdateQueue } from './update-queue';

/**
 * An {@link UpdateSource} decorator that routes a chat's updates through an
 * {@link UpdateQueue} — per-chat FIFO serialization plus bounded concurrency —
 * before the real listener. Applied by default over whatever source the
 * transport seam produces (polling, webhook, or a user's own), one per bot.
 *
 * Pure composition over the public `UpdateSource` interface: it holds the inner
 * source, forwards `start`/`stop`, and wraps the listener so each update is
 * admitted by the queue first. Nothing privileged — a bot author could write the
 * same decorator and register it through the `source` factory.
 *
 * On `stop` it stops the inner source first (no new updates) then drains the
 * queue, so in-flight updates finish instead of being dropped mid-shutdown.
 */
export class QueuedUpdateSource implements UpdateSource {
  constructor(
    private readonly inner: UpdateSource,
    private readonly queue: UpdateQueue,
  ) {}

  start(onUpdate: UpdateListener): Promise<void> {
    return this.inner.start((update) =>
      this.queue.enqueue(update, () => Promise.resolve(onUpdate(update))),
    );
  }

  async stop(): Promise<void> {
    await this.inner.stop();
    await this.queue.drain();
  }
}
