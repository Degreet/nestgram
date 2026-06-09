// The default session store is the shared in-process {@link MemoryStore}; kept
// under the `MemorySessionStore` name so the public API and existing imports
// stay stable.
export { MemoryStore as MemorySessionStore } from '../store/key-value-store';
