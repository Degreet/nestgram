import { commandArgs } from './command-args.factory';
import { CommandArgsError } from './command-args.error';
import { NestgramConfigError } from '../exceptions/config.exception';

describe('commandArgs', () => {
  it('parses positional tokens into a typed, coerced object', () => {
    const schema = commandArgs({ amount: Number, flag: Boolean, note: String });

    expect(schema.parse('5 1 buy milk')).toEqual({
      amount: 5,
      flag: true,
      note: 'buy milk',
    });
  });

  it('makes the last field greedy — trailing text stays in one piece', () => {
    const schema = commandArgs({ when: String, text: String });

    expect(schema.parse('10m call mom and dad')).toEqual({
      when: '10m',
      text: 'call mom and dad',
    });
  });

  it('treats a single-field schema as the whole payload', () => {
    const schema = commandArgs({ text: String });

    expect(schema.parse('hello there world')).toEqual({
      text: 'hello there world',
    });
  });

  it('throws CommandArgsError naming the missing arguments', () => {
    const schema = commandArgs({ amount: Number, note: String });

    expect(() => schema.parse('5')).toThrow(CommandArgsError);
    expect(() => schema.parse('5')).toThrow(/Missing argument\(s\): note/);
  });

  it('throws on empty payload, listing every required field', () => {
    const schema = commandArgs({ amount: Number, note: String });

    expect(() => schema.parse(undefined)).toThrow(/amount, note/);
    expect(() => schema.parse('   ')).toThrow(CommandArgsError);
  });

  it('throws CommandArgsError when a token does not fit its type', () => {
    const schema = commandArgs({ amount: Number, note: String });

    expect(() => schema.parse('abc milk')).toThrow(
      /Argument "amount" must be a number, got "abc"/,
    );
  });

  it('rejects a non-canonical number (leading zeros, scientific form)', () => {
    const schema = commandArgs({ amount: Number });

    expect(() => schema.parse('007')).toThrow(CommandArgsError);
    expect(() => schema.parse('1e3')).toThrow(CommandArgsError);
    expect(schema.parse('1000')).toEqual({ amount: 1000 });
  });

  it('rejects an empty schema at construction', () => {
    expect(() => commandArgs({})).toThrow(NestgramConfigError);
  });
});
