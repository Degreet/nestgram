import { runAmbient, setAmbient } from '../ambient';
import { NestgramError } from '../exceptions';
import { TelegramExecutionContext } from '../engine/context';
import { MemoryStore } from '../store';
import { scene, SceneContext } from './scene.context';
import { SCENES, SCENES_BINDING } from './scenes.constants';
import type {
  SceneBinding,
  SceneLifecycleRunner,
  SceneSnapshot,
} from './scenes.types';

/** A runner stub: a fixed scene "wizard" with three steps and recorded hooks. */
function fakeRunner(): SceneLifecycleRunner & {
  enters: string[];
  leaves: string[];
} {
  const enters: string[] = [];
  const leaves: string[] = [];
  return {
    enters,
    leaves,
    idOf: () => 'wizard',
    stepCount: () => 3,
    ordinalOf: (_id, step) =>
      typeof step === 'number' ? step : ['a', 'b', 'c'].indexOf(step),
    runEnter: async (id) => {
      enters.push(id);
      return `entered ${id}`;
    },
    runLeave: async (id) => {
      leaves.push(id);
    },
  };
}

function seed(
  snapshot: SceneSnapshot,
  runner: SceneLifecycleRunner,
  store = new MemoryStore(),
): { store: MemoryStore; key: string } {
  const key = 'scenes:test';
  setAmbient(SCENES, snapshot);
  setAmbient(SCENES_BINDING, {
    key,
    store,
    ctx: {} as TelegramExecutionContext,
    runner,
  } satisfies SceneBinding);
  return { store, key };
}

function idle(): SceneSnapshot {
  return { active: null, step: 0, data: {}, stack: [] };
}

function active(step = 0, data: Record<string, unknown> = {}): SceneSnapshot {
  return { active: 'wizard', step, data, stack: [] };
}

describe('SceneContext', () => {
  it('is reachable as the free `scene()` anywhere in the update chain', async () => {
    await runAmbient(async () => {
      seed(active(1, { name: 'Ann' }), fakeRunner());
      // Simulates a service called deep in the handler chain — no injection.
      const fromService = scene<{ name: string }>();
      expect(fromService.current()).toEqual({ scene: 'wizard', step: 1 });
      expect(fromService.data()).toEqual({ name: 'Ann' });
    });
  });

  it('current() is null and data() is {} when no scene is active', async () => {
    await runAmbient(async () => {
      seed(idle(), fakeRunner());
      const ctx = new SceneContext();
      expect(ctx.current()).toBeNull();
      expect(ctx.data()).toEqual({});
    });
  });

  it('update() merges and setData() replaces, write-through to the store', async () => {
    await runAmbient(async () => {
      const { store, key } = seed(active(0, { a: 1 }), fakeRunner());
      const ctx = new SceneContext<{ a: number; b: number }>();

      await ctx.update({ b: 2 });
      expect(ctx.data()).toEqual({ a: 1, b: 2 });
      expect((store.get(key) as SceneSnapshot).data).toEqual({ a: 1, b: 2 });

      await ctx.setData({ a: 9, b: 9 });
      expect(ctx.data()).toEqual({ a: 9, b: 9 });
    });
  });

  it('next/back/goto move the step pointer and resolve to the reply', async () => {
    await runAmbient(async () => {
      const { store, key } = seed(active(0), fakeRunner());
      const ctx = new SceneContext();

      await expect(ctx.next('q2')).resolves.toBe('q2');
      expect((store.get(key) as SceneSnapshot).step).toBe(1);

      await expect(ctx.back('q1')).resolves.toBe('q1');
      expect((store.get(key) as SceneSnapshot).step).toBe(0);

      await expect(ctx.goto('c', 'q3')).resolves.toBe('q3');
      expect((store.get(key) as SceneSnapshot).step).toBe(2);
    });
  });

  it('next clamps at the last step; back clamps at the first', async () => {
    await runAmbient(async () => {
      const { store, key } = seed(active(2), fakeRunner());
      const ctx = new SceneContext();

      await ctx.next(); // already last (3 steps → max ordinal 2)
      expect((store.get(key) as SceneSnapshot).step).toBe(2);

      await ctx.goto(0);
      await ctx.back(); // already first
      expect((store.get(key) as SceneSnapshot).step).toBe(0);
    });
  });

  it('enter from idle runs @OnEnter and resolves to its reply', async () => {
    await runAmbient(async () => {
      const runner = fakeRunner();
      const { store, key } = seed(idle(), runner);
      const ctx = new SceneContext();

      await expect(ctx.enter(class Wizard {})).resolves.toBe('entered wizard');
      expect(runner.enters).toEqual(['wizard']);
      const stored = store.get(key) as SceneSnapshot;
      expect(stored.active).toBe('wizard');
      expect(stored.step).toBe(0);
    });
  });

  it('leave runs @OnLeave, wipes data, and clears the record when idle', async () => {
    await runAmbient(async () => {
      const runner = fakeRunner();
      const { store, key } = seed(active(1, { name: 'X' }), runner);
      const ctx = new SceneContext();

      await expect(ctx.leave('bye')).resolves.toBe('bye');
      expect(runner.leaves).toEqual(['wizard']);
      expect(store.get(key)).toBeUndefined(); // record cleared
    });
  });

  it('throws when navigating with no active scene', async () => {
    await runAmbient(async () => {
      seed(idle(), fakeRunner());
      const ctx = new SceneContext();
      await expect(ctx.next('x')).rejects.toThrow(NestgramError);
      await expect(ctx.update({})).rejects.toThrow(NestgramError);
    });
  });

  it('throws when scenes are off (no binding in the ambient store)', async () => {
    await runAmbient(async () => {
      const ctx = new SceneContext();
      // current()/data() degrade gracefully; a transition throws.
      expect(ctx.current()).toBeNull();
      expect(ctx.data()).toEqual({});
      await expect(ctx.update({})).rejects.toThrow(NestgramError);
      await expect(ctx.enter(class W {})).rejects.toThrow(NestgramError);
    });
  });
});
