import { Logger } from '@nestjs/common';

import { clearSelectedIds, setSelectedIds } from './checkbox-selection';

describe('checkbox selection writers', () => {
  it('warn and no-op when the group id is not a registered checkbox group', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    expect(() => setSelectedIds('nope', ['x'])).not.toThrow();
    expect(() => clearSelectedIds('nope')).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('nope'));

    warn.mockRestore();
  });
});
