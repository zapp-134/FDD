import { parseKpis } from '../../src/lib/validators';

describe('validators', () => {
  test('parseKpis accepts valid shape', () => {
    const input = { revenue: 1000, growth: 5, activeUsers: 42 };
    const v = parseKpis(input);
    expect(v.revenue).toBe(1000);
  });
});
