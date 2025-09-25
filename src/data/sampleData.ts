// Sample financial data for Due Diligence Agent prototype
export const SAMPLE_DATA = {
  // KPI metrics
  kpis: {
    netMargin: {
      label: "Net Margin",
      value: "12.4%",
      change: "+2.1%",
      trend: "positive",
      description: "Improvement in operational efficiency"
    },
    currentRatio: {
      label: "Current Ratio",
      value: "1.82",
      change: "-0.3",
      trend: "negative", 
      description: "Slight decrease in liquidity position"
    },
    customerConcentration: {
      label: "Customer Concentration",
      value: "34%",
      change: "+5%",
      trend: "negative",
      description: "Increased dependency on top 3 customers"
    },
    redFlags: {
      label: "Red Flags",
      value: "7",
      change: "+2",
      trend: "negative",
      description: "New revenue recognition and expense timing issues"
    }
  },

  // Financial statements data
  financials: {
    currentYear: 2024,
    priorYear: 2023,
    lineItems: [
      {
        category: "Revenue",
        currentYear: 12450000,
        priorYear: 11200000,
        variance: 11.2,
        notes: "Strong growth in SaaS subscriptions"
      },
      {
        category: "Cost of Goods Sold",
        currentYear: 4980000,
        priorYear: 4760000,
        variance: 4.6,
        notes: "Higher hosting costs due to customer growth"
      },
      {
        category: "Gross Profit",
        currentYear: 7470000,
        priorYear: 6440000,
        variance: 16.0,
        notes: "Improved gross margin from pricing optimization"
      },
      {
        category: "Operating Expenses",
        currentYear: 5890000,
        priorYear: 5320000,
        variance: 10.7,
        notes: "Increased R&D and sales investments"
      },
      {
        category: "Operating Income",
        currentYear: 1580000,
        priorYear: 1120000,
        variance: 41.1,
        notes: "Strong operational leverage"
      },
      {
        category: "Net Income",
        currentYear: 1240000,
        priorYear: 890000,
        variance: 39.3,
        notes: "Effective tax management strategies"
      }
    ]
  },

  // Revenue trend data (last 8 quarters)
  revenueTrend: [
    { quarter: "Q1 2023", revenue: 2650000 },
    { quarter: "Q2 2023", revenue: 2720000 },
    { quarter: "Q3 2023", revenue: 2880000 },
    { quarter: "Q4 2023", revenue: 2950000 },
    { quarter: "Q1 2024", revenue: 3100000 },
    { quarter: "Q2 2024", revenue: 3200000 },
    { quarter: "Q3 2024", revenue: 3250000 },
    { quarter: "Q4 2024", revenue: 2900000 }
  ],

  // Quarterly profit data
  quarterlyProfit: [
    { quarter: "Q1 2024", profit: 285000 },
    { quarter: "Q2 2024", profit: 320000 },
    { quarter: "Q3 2024", profit: 365000 },
    { quarter: "Q4 2024", profit: 270000 }
  ],

  // Ingestion history
  ingestionHistory: [
    {
      runId: "RUN-2024-001",
      fileName: "TechCorp_Financials_2024.pdf",
      uploadDate: "2024-01-15",
      status: "completed",
      fileSize: "2.4 MB",
      processingTime: "3m 24s"
    },
    {
      runId: "RUN-2024-002", 
      fileName: "TechCorp_Banking_Dec2024.pdf",
      uploadDate: "2024-01-14",
      status: "completed",
      fileSize: "1.8 MB",
      processingTime: "2m 15s"
    },
    {
      runId: "RUN-2024-003",
      fileName: "TechCorp_Contracts_Q4.zip",
      uploadDate: "2024-01-13",
      status: "processing",
      fileSize: "5.2 MB",
      processingTime: "1m 45s"
    },
    {
      runId: "RUN-2024-004",
      fileName: "TechCorp_Audit_2023.xlsx",
      uploadDate: "2024-01-12",
      status: "error",
      fileSize: "3.1 MB",
      processingTime: "Failed"
    }
  ],

  // Red flags data
  redFlags: [
    {
      category: "Revenue Recognition",
      severity: "High",
      description: "Unusual spike in Q4 revenue concentration",
      impact: "May indicate channel stuffing or pull-forward tactics",
      recommendation: "Review detailed sales transactions and customer contracts"
    },
    {
      category: "Expense Timing", 
      severity: "Medium",
      description: "Large one-time consulting expenses in Q3",
      impact: "Could mask underlying operational inefficiencies",
      recommendation: "Analyze nature and business justification of consulting spend"
    },
    {
      category: "Cash Flow",
      severity: "Medium", 
      description: "Working capital changes don't align with revenue growth",
      impact: "Potential collection issues or aggressive revenue recognition",
      recommendation: "Deep dive into accounts receivable aging and collection patterns"
    },
    {
      category: "Customer Concentration",
      severity: "High",
      description: "Top 3 customers represent 34% of total revenue",
      impact: "High customer concentration risk",
      recommendation: "Assess customer contract terms and diversification strategy"
    }
  ],

  // Chat Q&A data for simulated responses
  chatResponses: {
    "revenue": "Based on the financial analysis, TechCorp's revenue grew 11.2% year-over-year to $12.45M in 2024. The growth was primarily driven by SaaS subscription expansion, with particularly strong performance in Q2 and Q3. However, Q4 showed a concerning decline that warrants further investigation.",
    "profit": "TechCorp's profitability improved significantly with net income growing 39.3% to $1.24M. The company demonstrated strong operational leverage with operating income growth of 41.1%, indicating effective cost management and scaling efficiencies.",
    "red flags": "The analysis identified 7 red flags, with 2 high-severity issues: unusual Q4 revenue concentration and high customer concentration (34% from top 3 customers). Medium-severity flags include timing of consulting expenses and working capital misalignment.",
    "cash flow": "Working capital changes don't align with revenue growth patterns, suggesting potential collection issues. This discrepancy, combined with the Q4 revenue spike, raises concerns about revenue quality and timing.",
    "customers": "Customer concentration risk is elevated with top 3 customers representing 34% of revenue. This creates significant business risk if any major customer is lost. Review customer contract terms and retention strategies.",
    "default": "I can help you analyze TechCorp's financial data. Try asking about revenue, profitability, red flags, cash flow, or customer concentration. What specific aspect would you like to explore?"
  },

  // Company metadata
  company: {
    name: "TechCorp Solutions Inc.",
    runId: "RUN-2024-001",
    analysisDate: "January 15, 2024",
    analyst: "Financial Due Diligence Agent",
    reportVersion: "1.2"
  }
};