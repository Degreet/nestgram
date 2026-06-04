/**
 * The single shared, pure IR → TypeScript writer. Used by the object-interface
 * emitter, the method `Options`-interface emitter, AND the return-type slot, so
 * type spelling is defined in exactly one place. References resolve through the
 * manifest (`Chat` → `RawChat`, `User` → bare `User`).
 */
import { IrType } from './ir';
import { resolveReference } from './manifest';

function quoteLiteral(literal: string): string {
  if (literal.includes("'") || literal.includes('\\')) {
    throw new Error(
      `String literal needs escaping, unsupported by the emitter: ${literal}`,
    );
  }
  return `'${literal}'`;
}

/** A union (multi-variant) must be parenthesised before a `[]` array suffix. */
function needsArrayParens(element: IrType): boolean {
  return (
    element.kind === 'union' ||
    (element.kind === 'literalUnion' && element.literals.length > 1)
  );
}

export function irTypeToTs(type: IrType): string {
  switch (type.kind) {
    case 'primitive':
      return type.ts;
    case 'literalUnion':
      return type.literals.map(quoteLiteral).join(' | ');
    case 'reference':
      return resolveReference(type.name);
    case 'array': {
      const inner = irTypeToTs(type.element);
      return needsArrayParens(type.element) ? `(${inner})[]` : `${inner}[]`;
    }
    case 'union':
      return type.variants.map(irTypeToTs).join(' | ');
  }
}
