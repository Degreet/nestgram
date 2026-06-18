import { CommandRoutePattern } from './command-route-pattern';
import { NestgramConfigError } from '../exceptions/config.exception';

describe('CommandRoutePattern', () => {
  describe('compile', () => {
    it('exposes the command name and round-trips the template via source', () => {
      const pattern = CommandRoutePattern.compile('add :amount :note...');

      expect(pattern.commandName).toBe('add');
      expect(pattern.source).toBe('add :amount :note...');
    });

    it('collapses surplus whitespace in the template', () => {
      const pattern = CommandRoutePattern.compile('  add   :amount  ');

      expect(pattern.commandName).toBe('add');
      expect(pattern.source).toBe('add :amount');
    });

    it('rejects a template that starts with a parameter', () => {
      expect(() => CommandRoutePattern.compile(':amount')).toThrow(
        NestgramConfigError,
      );
    });

    it('rejects an invalid parameter name', () => {
      expect(() => CommandRoutePattern.compile('add :1amount')).toThrow(
        /invalid parameter ":1amount"/,
      );
    });

    it('rejects a repeated parameter', () => {
      expect(() => CommandRoutePattern.compile('add :id :id')).toThrow(
        /repeats the parameter ":id"/,
      );
    });

    it('rejects a greedy parameter that is not last', () => {
      expect(() => CommandRoutePattern.compile('add :note... :amount')).toThrow(
        /greedy parameter ":note\.\.\." that is not last/,
      );
    });

    it('rejects a greedy parameter with an empty name', () => {
      expect(() => CommandRoutePattern.compile('add :...')).toThrow(
        /invalid parameter ":\.\.\."/,
      );
    });
  });

  describe('matchArgs — exact arity', () => {
    it('captures each single-token parameter', () => {
      const pattern = CommandRoutePattern.compile('add :amount :note');

      expect(pattern.matchArgs('5 milk')).toEqual({
        amount: '5',
        note: 'milk',
      });
    });

    it('rejects too few tokens', () => {
      const pattern = CommandRoutePattern.compile('add :amount :note');

      expect(pattern.matchArgs('5')).toBeNull();
    });

    it('rejects too many tokens', () => {
      const pattern = CommandRoutePattern.compile('add :amount :note');

      expect(pattern.matchArgs('5 buy milk')).toBeNull();
    });

    it('matches a bare command only when there are no arguments', () => {
      const pattern = CommandRoutePattern.compile('start');

      expect(pattern.matchArgs(undefined)).toEqual({});
      expect(pattern.matchArgs('   ')).toEqual({});
      expect(pattern.matchArgs('ref_42')).toBeNull();
    });
  });

  describe('matchArgs — greedy rest', () => {
    it('captures one or more trailing tokens as a single value', () => {
      const pattern = CommandRoutePattern.compile('add :amount :note...');

      expect(pattern.matchArgs('5 buy oat milk')).toEqual({
        amount: '5',
        note: 'buy oat milk',
      });
    });

    it('requires at least one token for the greedy segment', () => {
      const pattern = CommandRoutePattern.compile('add :amount :note...');

      expect(pattern.matchArgs('5')).toBeNull();
    });

    it('lets a single greedy segment take the whole payload', () => {
      const pattern = CommandRoutePattern.compile('say :text...');

      expect(pattern.matchArgs('hello there world')).toEqual({
        text: 'hello there world',
      });
    });
  });

  describe('matchArgs — literal segments', () => {
    it('matches a literal argument and rejects a mismatch', () => {
      const pattern = CommandRoutePattern.compile('config set :key');

      expect(pattern.matchArgs('set theme')).toEqual({ key: 'theme' });
      expect(pattern.matchArgs('get theme')).toBeNull();
    });
  });

  describe('arity overloading', () => {
    it('selects disjoint handlers by token count', () => {
      const one = CommandRoutePattern.compile('add :amount');
      const two = CommandRoutePattern.compile('add :amount :note...');

      expect(one.matchArgs('5')).toEqual({ amount: '5' });
      expect(one.matchArgs('5 milk')).toBeNull();

      expect(two.matchArgs('5')).toBeNull();
      expect(two.matchArgs('5 milk')).toEqual({ amount: '5', note: 'milk' });
    });
  });
});
