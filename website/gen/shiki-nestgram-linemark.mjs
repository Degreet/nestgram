// ============================================================
// shiki-nestgram-linemark — a Shiki transformer that adds the `ci-mark`
// class to lines listed in a code block's `{N}` / `{N,M}` / `{N-M}` meta.
//
// The remark plugin (remark-nestgram-blocks) stamps `:::code{mark="6"}` into
// the fenced code node's `meta` as `{6}`. remark-rehype carries that to the
// hast code element's `data.meta`; Astro's highlight step reads it and forwards
// it to Shiki's `codeToHast` as `meta`, surfacing here as
// `this.options.meta.__raw`. Shiki calls the `line` hook per 1-based line, so
// we tag the marked ones. docs.css styles `.line.ci-mark` as the blue marker.
// ============================================================

function parseMarks(raw) {
  const marks = new Set();
  const groups = String(raw || '').match(/\{([\d,\s-]+)\}/g) || [];
  for (const g of groups) {
    for (const part of g.slice(1, -1).split(',')) {
      const token = part.trim();
      if (!token) continue;
      const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        for (let i = Number(range[1]); i <= Number(range[2]); i++) marks.add(i);
      } else if (/^\d+$/.test(token)) {
        marks.add(Number(token));
      }
    }
  }
  return marks;
}

function addClass(node, name) {
  node.properties = node.properties || {};
  const c = node.properties.className;
  if (Array.isArray(c)) c.push(name);
  else if (c) node.properties.className = [c, name];
  else node.properties.className = [name];
}

export default function shikiNestgramLinemark() {
  return {
    name: 'nestgram-linemark',
    line(node, lineNumber) {
      const raw = this.options?.meta?.__raw ?? '';
      if (!raw) return node;
      if (parseMarks(raw).has(lineNumber)) addClass(node, 'ci-mark');
      return node;
    },
  };
}
