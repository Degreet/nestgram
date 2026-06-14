import { runAmbient, setAmbient } from '../ambient';
import { SCENES } from './scenes.constants';
import { inScene, noScene } from './scene-filter.predicates';
import type { SceneSnapshot } from './scenes.types';

function seed(snapshot: SceneSnapshot | undefined): void {
  if (snapshot) {
    setAmbient(SCENES, snapshot);
  }
}

describe('scene-filter predicates', () => {
  it('inScene matches only when a scene is active', async () => {
    await runAmbient(async () => {
      seed({ active: 'reg', step: 0, data: {}, stack: [] });
      expect(inScene.matches({} as never)).toBe(true);
      expect(noScene.matches({} as never)).toBe(false);
    });
  });

  it('noScene matches when idle (active null)', async () => {
    await runAmbient(async () => {
      seed({ active: null, step: 0, data: {}, stack: [] });
      expect(noScene.matches({} as never)).toBe(true);
      expect(inScene.matches({} as never)).toBe(false);
    });
  });

  it('noScene matches when scenes are off entirely (no snapshot)', async () => {
    await runAmbient(async () => {
      seed(undefined);
      expect(noScene.matches({} as never)).toBe(true);
      expect(inScene.matches({} as never)).toBe(false);
    });
  });
});
