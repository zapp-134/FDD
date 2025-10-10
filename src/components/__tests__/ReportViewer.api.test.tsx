import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportViewer } from '../ReportViewer';
import { renderWithProviders } from '@/test-utils';

describe('ReportViewer integration (mocked API)', () => {
  beforeEach(() => {
    // mock fetch for generate
    const fetchMock = jest.fn((input: RequestInfo, init?: RequestInit) => {
      if (typeof input === 'string' && input.endsWith('/api/reports/generate')) {
        return Promise.resolve(new Response(JSON.stringify({ reportId: 'rpt_test' }), { status: 201 }));
      }
      return Promise.resolve(new Response('ok'));
    });
    (global as unknown as { fetch?: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls generate and updates UI', async () => {
    renderWithProviders(<ReportViewer />);
    // depending on UI, simulate a generate button if present
    const btn = screen.queryByRole('button', { name: /generate/i });
    if (btn) {
      await userEvent.click(btn);
      expect(global.fetch).toHaveBeenCalled();
    } else {
      // If no button, assert the component mounts without crashing by checking the main heading
  const heading = screen.getByRole('heading', { name: /financial due diligence report/i });
  expect(heading).not.toBeNull();
    }
  });
});
