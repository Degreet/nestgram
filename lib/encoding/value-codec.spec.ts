import { integerCodec, resolveCodec, ValueDecodeError } from './value-codec';
import { NestgramConfigError } from '../exceptions/config.exception';

describe('value codecs', () => {
  it('number: encodes and decodes canonical forms', () => {
    const codec = resolveCodec(Number);
    expect(codec.encode(42)).toBe('42');
    expect(codec.decode('42')).toBe(42);
    expect(codec.decode('-5')).toBe(-5);
  });

  it('number: rejects non-canonical and non-finite input', () => {
    const codec = resolveCodec(Number);
    for (const bad of ['0x10', '1e3', '007', ' 5', 'Infinity', '', 'abc']) {
      expect(() => codec.decode(bad)).toThrow(ValueDecodeError);
    }
  });

  it('boolean: only 1 / 0', () => {
    const codec = resolveCodec(Boolean);
    expect(codec.encode(true)).toBe('1');
    expect(codec.encode(false)).toBe('0');
    expect(codec.decode('1')).toBe(true);
    expect(codec.decode('0')).toBe(false);
    expect(() => codec.decode('2')).toThrow(ValueDecodeError);
  });

  it('string: passes through unchanged', () => {
    const codec = resolveCodec(String);
    expect(codec.encode('x')).toBe('x');
    expect(codec.decode('x')).toBe('x');
  });

  it('throws a config error for an unsupported spec', () => {
    // @ts-expect-error - Date is not a valid CodecSpec
    expect(() => resolveCodec(Date)).toThrow(NestgramConfigError);
  });
});

describe('integer codec (charset-safe)', () => {
  it('encodes and decodes safe integers, including negatives', () => {
    expect(integerCodec.encode(42)).toBe('42');
    expect(integerCodec.encode(-100)).toBe('-100');
    expect(integerCodec.decode('42')).toBe(42);
    expect(integerCodec.decode('-100')).toBe(-100);
  });

  it('refuses to encode a value that would not be charset-safe', () => {
    // Floats (`.`) and huge magnitudes (`e`/`+`) can't live in a deep link.
    expect(() => integerCodec.encode(0.5)).toThrow(NestgramConfigError);
    expect(() => integerCodec.encode(1e21)).toThrow(NestgramConfigError);
    expect(() => integerCodec.encode(NaN)).toThrow(NestgramConfigError);
  });

  it('rejects decoding non-integer or non-canonical input', () => {
    for (const bad of ['0.5', '1e3', '007', '0x10', 'Infinity', '']) {
      expect(() => integerCodec.decode(bad)).toThrow(ValueDecodeError);
    }
  });
});
