import { runAmbient, setAmbient } from '../ambient';
import { SCENES } from './scenes.constants';
import { idle, inSceneMarker } from './scene-filter.predicates';
import type { SceneSnapshot } from './scenes.types';

function seed(snapshot: SceneSnapshot | undefined): void {
  if (snapshot) {
    setAmbient(SCENES, snapshot);
  }
}

describe('scene-filter predicates', () => {
  it('idle does NOT match while a scene is active', async () => {
    await runAmbient(async () => {
      seed({ active: 'reg', step: 0, data: {}, stack: [] });
      expect(idle.matches({} as never)).toBe(false);
    });
  });

  it('idle matches when no scene is active', async () => {
    await runAmbient(async () => {
      seed({ active: null, step: 0, data: {}, stack: [] });
      expect(idle.matches({} as never)).toBe(true);
    });
  });

  it('idle matches when scenes are off entirely (no snapshot)', async () => {
    await runAmbient(async () => {
      seed(undefined);
      expect(idle.matches({} as never)).toBe(true);
    });
  });

  it('inSceneMarker always matches — it only tags a route as exempt', async () => {
    await runAmbient(async () => {
      seed({ active: 'reg', step: 0, data: {}, stack: [] });
      expect(inSceneMarker.matches({} as never)).toBe(true);
    });
    await runAmbient(async () => {
      seed(undefined);
      expect(inSceneMarker.matches({} as never)).toBe(true);
    });
  });
});
