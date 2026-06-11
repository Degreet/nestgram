import { defineConfig } from 'astro/config';
import remarkDirective from 'remark-directive';
import nestgramCodeTheme from './src/styles/nestgram-code-theme.mjs';
import remarkNestgramBlocks from './gen/remark-nestgram-blocks.mjs';
import shikiNestgramLinemark from './gen/shiki-nestgram-linemark.mjs';

// https://astro.build/config
//
// Docs are rendered by our own generator (src/pages/docs/[...slug].astro over
// the docs/ glob collection), not Starlight. The plugins below turn the
// block-directive vocabulary into the design HTML and highlight code with the
// nestgram Shiki theme; the line-mark transformer applies the `:::code{mark}`
// blue line highlight during highlighting:
//   remark-parse → remark-gfm → remark-directive → remark-nestgram-blocks
//   → remark-rehype → Shiki (nestgram theme + line-mark transformer)
//
// NB: plugins go through the flat `markdown.remarkPlugins`/`shikiConfig` keys
// (Astro's createMarkdownProcessor), not the Astro 6
// `markdown.processor: unified({...})` form — that form bypasses Astro's own
// Shiki highlight step, so neither `shikiConfig.transformers` nor the
// `:::code{mark}` highlight would run. Astro auto-migrates these flat keys
// internally; the deprecation notice it prints is cosmetic.
export default defineConfig({
  site: 'https://nestgram.vercel.app',
  markdown: {
    remarkPlugins: [remarkDirective, remarkNestgramBlocks],
    shikiConfig: {
      theme: nestgramCodeTheme,
      transformers: [shikiNestgramLinemark()],
    },
  },
});
