// Generates /llms.txt at build time from the docs collection, following the
// llmstxt.org convention: a short project description, then sections (one per
// sidebar group, in order) linking to each doc page with a one-line summary.
// Generated from the same frontmatter the site renders, so it never drifts.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { AGENT_RULES } from '../lib/agent-rules';

const SITE = 'https://nestgram.vercel.app';

const INTRO = `# Nestgram

> Nestgram is a framework (not a wrapper) for building Telegram bots on NestJS,
> using Nest's own execution pipeline. A \`@Router()\` is a controller, a Telegram
> update is a request, and a handler's return value is the reply. Guards,
> interceptors, pipes, and exception filters all work because handlers run
> through Nest's \`ExternalContextCreator\`. Events are rich typed objects
> (\`Message\`, \`CallbackQuery\`, …) passed positionally; param decorators
> (\`@Sender()\`, \`@Args()\`) cover cross-cutting values. The Bot API surface,
> sessions, i18n, typed callback-data, typed command args, a send throttler, and
> an FSM core are built in.

Status: v2 pre-release (alpha). Docs are authored as Markdown and rendered by a
custom Astro site.`;

const START_HERE = `## Start here

Read these in order to learn the model before reaching for the reference:

1. [What is Nestgram](${SITE}/docs/what-is-nestgram)
2. [Mental model](${SITE}/docs/mental-model)
3. [How Nestgram works](${SITE}/docs/how-nestgram-works)
4. [Guards & the Nest pipeline](${SITE}/docs/guards-and-pipeline)
5. [Extending Nestgram](${SITE}/docs/extending)`;

const cleanSlug = (id: string): string => id.replace(/^\d+[-_]/, '');

export const GET: APIRoute = async () => {
  const entries = await getCollection('docs');
  const sorted = [...entries].sort(
    (a, b) => (a.data.sidebar?.order ?? 999) - (b.data.sidebar?.order ?? 999),
  );

  // Group by sidebar group, preserving first-seen order.
  const groups: { label: string; items: typeof sorted }[] = [];
  for (const entry of sorted) {
    const label = entry.data.sidebar?.group ?? 'Docs';
    let group = groups.find((g) => g.label === label);
    if (!group) {
      group = { label, items: [] };
      groups.push(group);
    }
    group.items.push(entry);
  }

  const sections = groups.map((group) => {
    const lines = group.items.map((entry) => {
      const title = entry.data.sidebar?.label ?? entry.data.title;
      const href = `${SITE}/docs/${cleanSlug(entry.id)}`;
      const desc = entry.data.description ? `: ${entry.data.description}` : '';
      return `- [${title}](${href})${desc}`;
    });
    return `## ${group.label}\n\n${lines.join('\n')}`;
  });

  const body = `${INTRO}\n\n${AGENT_RULES}\n\n${START_HERE}\n\n${sections.join('\n\n')}\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
