import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';

import { TelegramExecutionContext } from '../engine/context';
import { HandlerExecutorFactory, HandlerInvoker } from '../engine/execution';
import { NestgramError } from '../exceptions';
import { SceneLifecycle, lifecycleOf } from './lifecycle.decorators';
import { sceneIdOf } from './scene.decorator';
import { stepMetadataOf } from './step.decorator';
import type { SceneClass, SceneLifecycleRunner } from './scenes.types';

/** A scene's discovered shape: its ordered steps and optional lifecycle hooks. */
interface SceneEntry {
  /** Step method names in declaration order — index is the step's ordinal. */
  steps: string[];
  enter?: HandlerInvoker;
  leave?: HandlerInvoker;
}

/**
 * The boot-time scene catalog and the engine behind {@link SceneContext}'s
 * lifecycle. The {@link RouteExplorer} counterpart for scenes: it scans every
 * `@Scene` provider once at startup to (1) number each scene's `@Step()` methods
 * by declaration order and bind their {@link StepPredicate}s, and (2) build ECC
 * invokers for the `@OnEnter`/`@OnLeave` hooks so they run through the full Nest
 * pipeline (`@SceneCtx()`, guards, …).
 *
 * Implements {@link SceneLifecycleRunner} so the stateless `SceneContext` reaches
 * it via the ambient binding — the same indirection `FsmContext` uses for its
 * store.
 */
@Injectable()
export class SceneRegistry
  implements OnApplicationBootstrap, SceneLifecycleRunner
{
  private readonly scenes = new Map<string, SceneEntry>();
  private readonly idByClass = new Map<SceneClass, string>();

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly executorFactory: HandlerExecutorFactory,
  ) {}

  onApplicationBootstrap(): void {
    for (const wrapper of this.discovery.getProviders()) {
      const { instance } = wrapper;
      if (!instance || typeof instance !== 'object') {
        continue;
      }
      const sceneId = sceneIdOf(instance.constructor);
      if (sceneId === undefined) {
        continue;
      }
      this.register(sceneId, instance);
    }
  }

  idOf(scene: SceneClass): string {
    const cached = this.idByClass.get(scene);
    if (cached !== undefined) {
      return cached;
    }
    const sceneId = sceneIdOf(scene);
    if (sceneId === undefined) {
      throw new NestgramError(
        `${scene.name} is not a scene — decorate it with @Scene('id').`,
      );
    }
    this.idByClass.set(scene, sceneId);
    return sceneId;
  }

  stepCount(sceneId: string): number {
    return this.entry(sceneId).steps.length;
  }

  ordinalOf(sceneId: string, step: number | string): number {
    if (typeof step === 'number') {
      return step;
    }
    const ordinal = this.entry(sceneId).steps.indexOf(step);
    if (ordinal === -1) {
      throw new NestgramError(
        `Scene "${sceneId}" has no step named "${step}".`,
      );
    }
    return ordinal;
  }

  async runEnter(
    sceneId: string,
    ctx: TelegramExecutionContext,
  ): Promise<string | void> {
    const result = await this.entry(sceneId).enter?.(ctx);
    return typeof result === 'string' ? result : undefined;
  }

  async runLeave(
    sceneId: string,
    ctx: TelegramExecutionContext,
  ): Promise<void> {
    await this.entry(sceneId).leave?.(ctx);
  }

  private register(sceneId: string, instance: object): void {
    if (this.scenes.has(sceneId)) {
      throw new NestgramError(
        `Duplicate scene id "${sceneId}" — each @Scene needs a unique id.`,
      );
    }

    const entry: SceneEntry = { steps: [] };
    const prototype = Object.getPrototypeOf(instance);

    for (const methodName of this.scanner.getAllMethodNames(prototype)) {
      const method = prototype[methodName];

      const step = stepMetadataOf(method);
      if (step) {
        step.predicate.bind(sceneId, entry.steps.length);
        entry.steps.push(methodName);
      }

      const phase = lifecycleOf(method);
      if (phase === SceneLifecycle.Enter) {
        entry.enter = this.executorFactory.create(instance, methodName);
      } else if (phase === SceneLifecycle.Leave) {
        entry.leave = this.executorFactory.create(instance, methodName);
      }
    }

    this.scenes.set(sceneId, entry);
    this.idByClass.set(instance.constructor as SceneClass, sceneId);
  }

  private entry(sceneId: string): SceneEntry {
    const entry = this.scenes.get(sceneId);
    if (!entry) {
      throw new NestgramError(`Unknown scene "${sceneId}".`);
    }
    return entry;
  }
}
