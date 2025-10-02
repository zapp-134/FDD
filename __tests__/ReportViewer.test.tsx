import React from 'react';
// Ensure the runtime shim indicates remote API usage for this test
(globalThis as any).__VITE_USE_REMOTE_API = 'true';

import { renderWithProviders, userEvent, flushPromises } from '@/test-utils';
import { screen, waitFor } from '@testing-library/react';
import { ReportViewer } from '@/components/ReportViewer';

// Mock the generate hook to return a mutateAsync that resolves to a reportId
jest.mock('@/hooks/api/useReportsGenerate', () => ({
  useReportsGenerate: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ reportId: 'mock_report_1' }),
  }),
}));

// Simplified mock: when reportId is provided, return ready with downloadUrl immediately
jest.mock('@/hooks/api/useReportStatus', () => ({
  __esModule: true,
  default: (reportId?: string) => {
    return {
      data: reportId ? { status: 'ready', downloadUrl: `/api/reports/${reportId}/download` } : { status: 'processing' },
      isFetching: false,
    };
  },
}));

describe('ReportViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls generate and reacts to ready status -> performs download', async () => {
    const clickSpy = jest.fn();
    const origCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = origCreate(tagName as any) as HTMLAnchorElement;
      if (tagName === 'a') {
        el.click = clickSpy as any;
      }
      return el as any;
    });

    renderWithProviders(<ReportViewer />);

    // Click the "Download Markdown" button which triggers generateRemoteReport when useRemote is true
    const mdButton = screen.getByRole('button', { name: /Download Markdown/i });
    await userEvent.click(mdButton);

    // wait for mutateAsync to resolve and effect to trigger click
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());

    (document.createElement as jest.Mock).mockRestore();
  });
});
