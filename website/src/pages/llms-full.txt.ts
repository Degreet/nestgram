// Generates /llms-full.txt at build time: the full text of every doc page
// concatenated in reading order, for LLMs that want the whole corpus in one
// fetch. Built from the docs collection's raw markdown bodies, with the block
// directives stripped to their inner content so the prose reads cleanly.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://nestgram.vercel.app';

const HEADER = `# Nestgram — full documentation

> Nestgram is a framework (not a wrapper) for building Telegram bots on NestJS,
> using Nest's own execution pipeline. This file is the full text of every docs
> page, concatenated in reading order.
`;

const cleanSlug = (id: string): string => id.replace(/^\d+[-_]/, '');

// The docs use :::name[label]{attrs} … ::: block directives for callouts and
// code islands. Strip the directive fences (keep the inner content) so the
// plain-text corpus reads as prose, not as our authoring vocabulary.
const stripDirectives = (md: string): string =>
  md
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (/^:::+[a-z]/i.test(t)) return false; // opening directive
      if (/^:::+\s*$/.test(t)) return false; // closing directive
      if (/^::[a-z]/i.test(t)) return false; // leaf directive (::tab[...])
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const GET: APIRoute = async () => {
  const entries = await getCollection('docs');
  const sorted = [...entries].sort(
    (a, b) => (a.data.sidebar?.order ?? 999) - (b.data.sidebar?.order ?? 999),
  );

  const pages = sorted.map((entry) => {
    const href = `${SITE}/docs/${cleanSlug(entry.id)}`;
    const desc = entry.data.description ? `\n${entry.data.description}\n` : '\n';
    const body = stripDirectives(entry.body ?? '');
    return `# ${entry.data.title}\n\nSource: ${href}\n${desc}\n${body}`;
  });

  const body = `${HEADER}\n${pages.join('\n\n---\n\n')}\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
