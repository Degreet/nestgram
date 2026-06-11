// ============================================================
// Nestgram — Expressive Code syntax theme
// Recreates the design mockup's hand-tuned code palette as a
// real VS Code / Shiki theme, so highlighted code blocks match
// the landing page exactly instead of a generic bundled theme.
//
// Mockup palette (.tok-* classes):
//   keyword     #ff7aa3  pink
//   decorator   #36b4f4  light blue   (@Router, @Command…)
//   function    #c4a6ff  purple
//   string      #8ee6a8  green
//   type/class  #7fd0ff  cyan
//   number      #ffcb7a  amber
//   comment     #525c6e  faint
//   punctuation #7c889b  muted
//   text        #eef1f6
// ============================================================

const fg = '#eef1f6';
const pink = '#ff7aa3';
const blue = '#36b4f4';
const purple = '#c4a6ff';
const green = '#8ee6a8';
const cyan = '#7fd0ff';
const amber = '#ffcb7a';
const faint = '#525c6e';
const muted = '#7c889b';
const prop = '#cdd6e6';

export default {
  name: 'nestgram-dark',
  type: 'dark',
  colors: {
    'editor.background': '#080a0f',
    'editor.foreground': fg,
  },
  settings: [
    { settings: { foreground: fg, background: '#080a0f' } },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: faint, fontStyle: 'italic' },
    },
    {
      scope: ['string', 'string.template', 'string.quoted', 'punctuation.definition.string'],
      settings: { foreground: green },
    },
    {
      scope: ['constant.numeric', 'constant.language', 'constant.language.boolean'],
      settings: { foreground: amber },
    },
    {
      scope: [
        'keyword',
        'keyword.control',
        'storage.type',
        'storage.modifier',
        'keyword.operator.new',
        'keyword.operator.expression',
        'keyword.control.import',
        'keyword.control.export',
        'keyword.control.from',
      ],
      settings: { foreground: pink },
    },
    {
      scope: [
        'entity.name.function',
        'support.function',
        'meta.function-call entity.name.function',
        'variable.function',
      ],
      settings: { foreground: purple },
    },
    {
      scope: [
        'entity.name.type',
        'entity.name.class',
        'support.type',
        'support.class',
        'entity.other.inherited-class',
        'entity.name.type.class',
      ],
      settings: { foreground: cyan },
    },
    // decorators win over plain function colouring — keep @Router blue.
    // NB: in the TS grammar a called decorator name is
    // `meta.decorator meta.function-call entity.name.function`; the selector
    // must include `meta.function-call` or the plain function rule outranks
    // this one (its parent match sits closer to the token) and decorator
    // names render purple.
    {
      scope: [
        'meta.decorator',
        'meta.decorator entity.name.function',
        'meta.decorator meta.function-call entity.name.function',
        'meta.decorator variable.other.readwrite',
        'meta.decorator punctuation.decorator',
        'punctuation.decorator',
        'entity.name.function.decorator',
      ],
      settings: { foreground: blue },
    },
    {
      scope: [
        'keyword.operator',
        'punctuation',
        'punctuation.separator',
        'punctuation.terminator',
        'punctuation.definition.block',
        'punctuation.definition.parameters',
        'meta.brace',
        'meta.delimiter',
      ],
      settings: { foreground: muted },
    },
    {
      scope: [
        'variable',
        'variable.other',
        'variable.other.readwrite',
        'variable.parameter',
        'meta.object-literal.key',
        'variable.other.property',
        'support.variable.property',
      ],
      settings: { foreground: prop },
    },
  ],
};
