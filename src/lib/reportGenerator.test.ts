import { generateMarkdownReport, formatCurrency } from './reportGenerator';
import { SAMPLE_DATA } from '@/data/sampleData';

test('formatCurrency formats numbers as USD', () => {
  expect(formatCurrency(1234567)).toBe('$1,234,567');
});

test('generateMarkdownReport returns non-empty string and includes company name', () => {
  const md = generateMarkdownReport(SAMPLE_DATA);
  expect(typeof md).toBe('string');
  expect(md.length).toBeGreaterThan(10);
  expect(md).toContain(SAMPLE_DATA.company.name);
});
