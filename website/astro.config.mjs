import { defineConfig } from 'astro/config';
import remarkDirective from 'remark-directive';
import nestgramCodeTheme from './src/styles/nestgram-code-theme.mjs';
import remarkNestgramBlocks from './gen/remark-nestgram-blocks.mjs';
import rehypeNestgramCodemark from './gen/rehype-nestgram-codemark.mjs';

// https://astro.build/config
//
// Docs are rendered by our own generator (src/pages/docs/[...slug].astro over
// the docs/ glob collection), not Starlight. The plugins below turn the
// block-directive vocabulary into the design HTML and highlight code with the
// nestgram Shiki theme; the codemark rehype plugin applies the `:::code{mark}`
// blue line highlight after Shiki (a Shiki transformer can't — Astro caches
// highlighted HTML keyed on lang+theme+code only, not meta, so per-page marks
// would bleed between pages):
//   remark-parse → remark-gfm → remark-directive → remark-nestgram-blocks
//   → remark-rehype → Shiki (nestgram theme) → rehype-nestgram-codemark
//
// NB: plugins go through the flat `markdown.remarkPlugins`/`rehypePlugins`/
// `shikiConfig` keys (Astro's createMarkdownProcessor), not the Astro 6
// `markdown.processor: unified({...})` form — that form bypasses Astro's own
// Shiki highlight step. Astro auto-migrates these flat keys internally; the
// deprecation notice it prints is cosmetic.
export default defineConfig({
  site: 'https://nestgram.vercel.app',
  markdown: {
    remarkPlugins: [remarkDirective, remarkNestgramBlocks],
    rehypePlugins: [rehypeNestgramCodemark],
    shikiConfig: {
      theme: nestgramCodeTheme,
    },
  },
});
