import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// The DX spec is the source of truth and lives in the repo-root `docs/`
// folder. `src/content/docs` is a symlink to it, so Starlight's own markdown
// pipeline (asides, heading links, etc.) runs on the files — which the
// external `glob({ base })` loader does NOT do — while authoring stays in
// the repo-root `docs/`.
export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
