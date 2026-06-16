export * from './api';
export * from './decorators';
export * from './decorators/params';
export * from './providers';
export * from './exceptions';
export * from './api/methods';
export * from './events';
export * from './keyboards';
export * from './formatting';
export * from './builtins';
export * from './callback-data';
export * from './command-args';
export * from './deep-links';
export * from './ambient';
export * from './store';
export * from './sessions';
export * from './i18n';
export * from './fsm';
export * from './scenes';
export * from './rate-limit';

// Engine public surface (the update -> dispatch pipeline).
export * from './engine/matching';
export * from './engine/context';
export * from './engine/discovery';
export * from './engine/execution';
export * from './engine/dispatcher';
export * from './engine/source';
export * from './engine/queue';
export * from './module';

// Testing utilities (dispatch fake updates against your routers). Jest-agnostic
// and dependency-light — safe to ship in the barrel.
export * from './testing';
