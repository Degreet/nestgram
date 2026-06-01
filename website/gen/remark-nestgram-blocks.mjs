// ============================================================
// remark-nestgram-blocks — the production block-directive plugin.
//
// Runs AFTER remark-directive (which parses `:::name[label]{attr=val}`
// containers into `containerDirective` mdast nodes). This plugin walks those
// nodes and rewrites each into the design markup that docs.css targets
// (.mental, .anno, .guardrail, .warnbox, .ng-aside, .ng-tabs, .code-island …).
// Authors only ever write directives; the block vocabulary is enumerable in
// this one file — the grammar an AI author generates against.
//
// Directive catalog (see docs-generator-plan.md):
//   :::note / :::tip / :::caution[title]     soft asides
//   :::warn[label]                           dramatic terminal-style box
//   :::mental                                mental-model flow card
//   :::anno                                  numbered annotations under code
//   :::guardrail[label]                      amber "only in Nestgram" badge
//   :::tabs{name} … ::tab[label] …           general N-tab, CSS-only
//   :::code[title]{mark="6"}                  windowed code w/ traffic-lights
//
// Implementation: we emit hast via `data.hName` / `data.hProperties` on real
// mdast nodes rather than raw `{type:'html'}` strings. Astro's content
// pipeline runs remark-rehype WITHOUT dangerous-HTML passthrough, so raw HTML
// strings would be dropped — hData survives. Inner children keep flowing
// through the normal pipeline, so inline markdown and Shiki highlighting still
// work inside blocks.
// ============================================================

import { visit, SKIP } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';

const ASIDE_TITLES = {
  note: 'Note',
  tip: 'Tip',
  caution: 'Caution',
};
const ACCENT_MARK = '*';
const FLOW_ARROW = '->';
const ARROW = '→'; // →
const MIDDOT = '·'; // ·

// Shell-ish fences (written as bare ```bash, not wrapped in :::code) should
// still get the code-island chrome, rendered as a terminal window.
const TERMINAL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'console']);
const TERMINAL_LABEL = 'Terminal';

// ---- hast element helpers ---------------------------------------------------
// An element node with given tag/classes/children that remark-rehype renders
// verbatim (no raw-HTML passthrough needed).
function el(tagName, properties, children = []) {
  return {
    type: 'element',
    data: { hName: tagName, hProperties: properties || {} },
    children,
  };
}

// A text node (mdast `text` → hast text).
function text(value) {
  return { type: 'text', value };
}

// Set hast tag/props on an existing mdast node, keeping its children flowing.
function asElement(node, tagName, properties) {
  node.data = node.data || {};
  node.data.hName = tagName;
  node.data.hProperties = properties || {};
  return node;
}

// remark-directive stores the `[label]` text in the first child paragraph,
// flagged `data.directiveLabel`. Pull it out; return { label, rest }.
function takeLabel(node) {
  const children = node.children || [];
  const first = children[0];
  if (first && first.data && first.data.directiveLabel) {
    return { label: toString(first), rest: children.slice(1) };
  }
  return { label: undefined, rest: children };
}

// Strip wrapping <p> from block children, keeping inline content.
function unwrapParagraphs(children) {
  const out = [];
  for (const child of children || []) {
    if (child.type === 'paragraph') out.push(...child.children);
    else out.push(child);
  }
  return out;
}

// ---- mental: chips split on "->", trailing "*" marks the accent chip --------
function buildMental(node) {
  const flow = toString(node).trim();
  const chips = [];
  const parts = flow
    .split(FLOW_ARROW)
    .map((c) => c.trim())
    .filter(Boolean);
  parts.forEach((c, i) => {
    const accent = c.endsWith(ACCENT_MARK);
    const label = accent ? c.slice(0, -1).trim() : c;
    chips.push(
      el('span', { className: accent ? ['mm-box', 'mm-accent'] : ['mm-box'] }, [text(label)]),
    );
    if (i < parts.length - 1) chips.push(el('span', { className: ['mm-arrow'] }, [text(ARROW)]));
  });
  asElement(node, 'div', { className: ['mental', 'not-content'] });
  return setChildren(node, [
    el('div', { className: ['mm-label'] }, [text('Mental model')]),
    el('div', { className: ['mm-flow'] }, chips),
  ]);
}

// asElement keeps the node's original children; for blocks where we replace the
// whole inner structure we overwrite children here.
function setChildren(node, children) {
  node.children = children;
  return node;
}

// ---- anno: an ordered list → numbered callouts ------------------------------
function buildAnno(node) {
  const list = (node.children || []).find((c) => c.type === 'list');
  const rows = [];
  if (list) {
    list.children.forEach((item, i) => {
      const inner = unwrapParagraphs(item.children);
      rows.push(
        el('div', { className: ['ai'] }, [
          el('span', { className: ['n'] }, [text(String(i + 1))]),
          el('p', {}, inner),
        ]),
      );
    });
  }
  asElement(node, 'div', { className: ['anno', 'not-content'] });
  return setChildren(node, rows);
}

// ---- guardrail: amber "only in Nestgram" badge ------------------------------
function buildGuardrail(node) {
  const { label, rest } = takeLabel(node);
  const labelText = label ? `GUARDRAIL ${MIDDOT} ${label}` : 'GUARDRAIL';
  asElement(node, 'div', { className: ['guardrail', 'not-content'] });
  return setChildren(node, [
    el('div', { className: ['gr-ico'] }, [warnIcon()]),
    el('div', { className: ['gr-body'] }, [
      el('span', { className: ['gr-label'] }, [text(labelText)]),
      ...unwrapParagraphs(rest),
    ]),
  ]);
}

// ---- soft asides: note / tip / caution --------------------------------------
function buildAside(kind, node) {
  const { label, rest } = takeLabel(node);
  const title = label || ASIDE_TITLES[kind];
  asElement(node, 'aside', { className: ['ng-aside', `ng-aside--${kind}`, 'not-content'] });
  return setChildren(node, [
    el('p', { className: ['ng-aside__title'] }, [text(title)]),
    el('div', { className: ['ng-aside__body'] }, rest),
  ]);
}

// A crisp warning triangle (rounded corners + exclamation) replacing the
// stock (warn) glyph. Inherits colour from `.warnbox .wlabel`.
function warnIcon() {
  return el(
    'svg',
    {
      className: ['wicon'],
      viewBox: '0 0 24 24',
      width: '15',
      height: '15',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
    },
    [
      el('path', {
        d: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
      }),
      el('line', { x1: '12', y1: '9', x2: '12', y2: '13' }),
      el('line', { x1: '12', y1: '17', x2: '12.01', y2: '17' }),
    ],
  );
}

// ---- warn: dramatic terminal-style box (landing .warnbox look) --------------
// Body paragraphs are dimmed mono lines; a blockquote becomes the blue fix arrow.
function buildWarn(node) {
  const { label, rest } = takeLabel(node);
  const labelText = label || 'Nestgram warning';
  const body = [];
  for (const child of rest) {
    if (child.type === 'blockquote') {
      body.push(
        el('div', { className: ['wfix'] }, [
          el('span', { className: ['warrow'] }, [text(ARROW)]),
          text(' '),
          ...unwrapParagraphs(child.children),
        ]),
      );
    } else if (child.type === 'paragraph') {
      body.push(el('p', { className: ['dim'] }, child.children));
    } else {
      body.push(child);
    }
  }
  asElement(node, 'div', { className: ['warnbox', 'not-content'] });
  return setChildren(node, [
    el('div', { className: ['wlabel'] }, [warnIcon(), text(' '), text(labelText)]),
    el('div', { className: ['wbody'] }, body),
  ]);
}

// ---- tabs: general N-tab, CSS-only, auto-numbered ---------------------------
// :::tabs{name="run"}  with `::tab[label]` leaf directives marking each panel.
function buildTabs(node, makeId) {
  const name = (node.attributes && node.attributes.name) || makeId();
  const panels = [];
  for (const child of node.children || []) {
    if (child.type === 'leafDirective' && child.name === 'tab') {
      panels.push({ label: toString(child).trim(), body: [] });
    } else if (panels.length) {
      panels[panels.length - 1].body.push(child);
    }
  }
  if (!panels.length) {
    asElement(node, 'div', { className: ['ng-tabs', 'not-content'] });
    return setChildren(node, []);
  }

  const kids = [];
  // radio inputs (first checked)
  panels.forEach((_, i) => {
    const props = { type: 'radio', name, id: `${name}-${i + 1}` };
    if (i === 0) props.checked = true;
    kids.push(el('input', props));
  });
  // tablist
  kids.push(
    el(
      'div',
      { className: ['ng-tablist'] },
      panels.map((p, i) =>
        el('label', { htmlFor: `${name}-${i + 1}` }, [text(p.label || `Tab ${i + 1}`)]),
      ),
    ),
  );
  // panels
  panels.forEach((p, i) => {
    kids.push(el('div', { className: ['ng-tab', `tab-${i + 1}`] }, p.body));
  });

  asElement(node, 'div', { className: ['ng-tabs', 'not-content'], 'data-tabs': name });
  return setChildren(node, kids);
}

// ---- code-island: windowed code with traffic-light chrome -------------------
// :::code[greet.router.ts]{mark="6"}  (label = filename; mark = 1-based line).
// The inner fenced `code` node keeps flowing through Shiki downstream; we wrap
// it in chrome and stamp the marked line into the code node's `meta` for the
// Shiki line-mark transformer (astro.config) to highlight.
function buildCodeIsland(node) {
  const { label } = takeLabel(node);
  const codeNode = (node.children || []).find((c) => c.type === 'code');
  if (!codeNode) {
    asElement(node, 'figure', { className: ['code-island'] });
    return setChildren(node, []);
  }
  const mark = node.attributes && node.attributes.mark ? Number(node.attributes.mark) : 0;
  const className = label ? ['code-island', 'is-framed'] : ['code-island'];
  const props = { className };
  // Carry the 1-based marked line on the figure. In hast `hProperties`, a
  // data attribute is written camelCase (`dataMark`) so remark-rehype
  // serializes it as `data-mark`. The highlight itself is applied by
  // rehype-nestgram-codemark, which runs AFTER Astro's Shiki step (a Shiki
  // transformer is unreliable here — Astro caches highlighted HTML keyed on
  // lang+theme+code only, not meta).
  if (mark > 0) props.dataMark = String(mark);

  const kids = [];
  if (label) {
    kids.push(
      el('div', { className: ['ci-bar'] }, [
        el('span', { className: ['ci-dot'] }),
        el('span', { className: ['ci-dot'] }),
        el('span', { className: ['ci-dot'] }),
        el('span', { className: ['ci-name'] }, [text(label)]),
      ]),
    );
  }
  kids.push(codeNode);
  asElement(node, 'figure', props);
  return setChildren(node, kids);
}

// ---- terminal island: wrap a bare shell fence in code-island chrome --------
// Bare ```bash fences never reach buildCodeIsland (they aren't directives), so
// they'd render as a plain Shiki <pre> with no chrome. Wrap such a top-level
// code node in the same figure/.ci-bar structure, flagged as a terminal.
function wrapTerminalIsland(codeNode, index, parent) {
  const figure = el(
    'figure',
    { className: ['code-island', 'is-framed', 'is-terminal'] },
    [
      el('div', { className: ['ci-bar'] }, [
        el('span', { className: ['ci-dot'] }),
        el('span', { className: ['ci-dot'] }),
        el('span', { className: ['ci-dot'] }),
        el('span', { className: ['ci-name'] }, [text(TERMINAL_LABEL)]),
      ]),
      codeNode,
    ],
  );
  parent.children[index] = figure;
}

export default function remarkNestgramBlocks() {
  let counter = 0;
  const makeId = () => `ngtab-${++counter}`;

  return (tree) => {
    visit(tree, 'containerDirective', (node) => {
      switch (node.name) {
        case 'note':
        case 'tip':
        case 'caution':
          buildAside(node.name, node);
          return SKIP;
        case 'warn':
          buildWarn(node);
          return SKIP;
        case 'mental':
          buildMental(node);
          return SKIP;
        case 'anno':
          buildAnno(node);
          return SKIP;
        case 'guardrail':
          buildGuardrail(node);
          return SKIP;
        case 'tabs':
          buildTabs(node, makeId);
          return SKIP;
        case 'code':
          buildCodeIsland(node);
          return SKIP;
        default:
          // unknown directive: render as a plain div so content is never lost.
          asElement(node, 'div', {});
          return SKIP;
      }
    });

    // Second pass: bare shell fences at the top level become terminal islands.
    // (Code nodes already inside a :::code figure are children of a figure, not
    // of the root, so they're left untouched.)
    visit(tree, 'code', (node, index, parent) => {
      if (!parent || parent.type !== 'root' || index == null) return;
      if (!TERMINAL_LANGS.has((node.lang || '').toLowerCase())) return;
      wrapTerminalIsland(node, index, parent);
      return SKIP;
    });
  };
}
