import { SAMPLE_DATA } from '@/data/sampleData';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateMarkdownReport(data = SAMPLE_DATA): string {
  // Keep this pure and deterministic so it is testable and small enough for Sonar
  const company = data.company;
  const lines: string[] = [];
  lines.push(`# Financial Due Diligence Report`);
  lines.push('');
  lines.push(`## ${company.name}`);
  lines.push('');
  lines.push(`**Analysis Date:** ${company.analysisDate}  `);
  lines.push(`**Run ID:** ${company.runId}  `);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push('TechCorp Solutions Inc. demonstrates strong operational performance with revenue growth.');
  lines.push('');
  lines.push('### Key Findings');
  lines.push('');
  // minimal KPI table
  lines.push(`- **Revenue Growth**: $${data.financials.lineItems[0].currentYear.toLocaleString()} `);
  lines.push(`- **Net Margin**: ${data.kpis.netMargin.value}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Red Flags');
  data.redFlags.forEach((flag) => {
    lines.push(`### ${flag.category}`);
    lines.push(`- Severity: ${flag.severity}`);
    lines.push(`- Description: ${flag.description}`);
    lines.push('');
  });

  return lines.join('\n');
}

export default { formatCurrency, generateMarkdownReport };
