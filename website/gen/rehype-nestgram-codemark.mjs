// ============================================================
// rehype-nestgram-codemark — applies the `:::code{mark}` line highlight.
//
// remark-nestgram-blocks stamps the directive's `mark` attribute onto the
// code-island figure as `data-mark` ("6", "3,5", "11-12"). This plugin runs
// after Astro's Shiki step and adds `ci-mark` to the listed 1-based lines;
// docs.css styles `.ci-mark` as the blue marker. (A Shiki transformer can't
// do this — Astro caches highlighted HTML keyed on lang+theme+code only, not
// meta, so per-page marks would bleed between pages.)
//
// At this stage Shiki's line spans are the direct span children of the
// <code> element but do NOT carry their `line` class yet (Astro normalizes
// that later), so lines are counted structurally, not by class.
// ============================================================

import { visit } from 'unist-util-visit';

function parseMarks(raw) {
  const marks = new Set();
  for (const part of String(raw || '').split(',')) {
    const token = part.trim();
    if (!token) continue;
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      for (let i = Number(range[1]); i <= Number(range[2]); i++) marks.add(i);
    } else if (/^\d+$/.test(token)) {
      marks.add(Number(token));
    }
  }
  return marks;
}

function classList(node) {
  const c = node.properties?.className;
  if (Array.isArray(c)) return c;
  if (typeof c === 'string') return c.split(/\s+/);
  return [];
}

export default function rehypeNestgramCodemark() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'figure' || !classList(node).includes('code-island')) {
        return;
      }
      const marks = parseMarks(node.properties?.dataMark);
      if (marks.size === 0) return;

      visit(node, 'element', (el) => {
        if (el.tagName !== 'code') return;
        let lineNo = 0;
        for (const child of el.children || []) {
          if (child.type !== 'element' || child.tagName !== 'span') continue;
          lineNo += 1;
          if (marks.has(lineNo)) {
            child.properties = child.properties || {};
            child.properties.className = [...classList(child), 'ci-mark'];
          }
        }
      });
    });
  };
}
