import type { RoutePredicate } from '../engine/matching';
import type { Route } from '../engine/discovery';
import { idle, inSceneMarker } from './scene-filter.predicates';
import { SceneRouteGate } from './scene-route.transform';
import { StepPredicate } from './step.predicate';

const always: RoutePredicate = { matches: () => true };

function route(predicates: RoutePredicate[]): Route {
  return {
    updateType: 'message',
    predicates,
    instance: {},
    methodName: 'handle',
  };
}

describe('SceneRouteGate', () => {
  const gate = new SceneRouteGate();

  it('ANDs the idle gate onto a normal route (suppressed while a scene is active)', () => {
    const [gated] = gate.transform([route([always])]);
    expect(gated.predicates).toEqual([idle, always]);
  });

  it('leaves a @Step route untouched (it self-gates to its scene+ordinal)', () => {
    const step = new StepPredicate();
    const [unchanged] = gate.transform([route([step])]);
    expect(unchanged.predicates).toEqual([step]);
  });

  it('leaves an @InScene()-marked route untouched (exempt)', () => {
    const [unchanged] = gate.transform([route([inSceneMarker, always])]);
    expect(unchanged.predicates).toEqual([inSceneMarker, always]);
  });

  it('gates each route independently across a mixed table', () => {
    const step = new StepPredicate();
    const [normal, stepRoute, exempt] = gate.transform([
      route([always]),
      route([step]),
      route([inSceneMarker]),
    ]);
    expect(normal.predicates).toEqual([idle, always]);
    expect(stepRoute.predicates).toEqual([step]);
    expect(exempt.predicates).toEqual([inSceneMarker]);
  });
});
