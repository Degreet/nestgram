import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Docs content lives in the repo-root `docs/` folder — the single source of
// truth (the DX spec). We point a glob loader at it directly so authors keep
// editing those files; adding a `.md` there makes a page appear automatically.
//
// Sidebar grouping/order comes from each file's own frontmatter (no central
// sidebar.ts to drift): `sidebar: { label, group, order }`.
const docs = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/README.md'], base: '../docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    sidebar: z
      .object({
        label: z.string().optional(),
        group: z.string().optional(),
        order: z.number().optional(),
      })
      .optional(),
  }),
});

export const collections = { docs };
