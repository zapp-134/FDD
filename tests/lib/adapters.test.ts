import { adaptKpis } from '../../src/lib/adapters';

describe('adapters', () => {
  test('adaptKpis normalizes valid input', () => {
    const raw = { revenue: 200, growth: 2 };
    const v = adaptKpis(raw);
    expect(v.revenue).toBe(200);
  });
});
