import * as React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { renderWithProviders, userEvent } from '@/test-utils';

// Import the hook after global mocks are in place
const { useIngestUpload } = require('@/hooks/api/useIngestUpload');

const TestComponent = () => {
  const mutation = useIngestUpload();
  const start = async () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
  await mutation.mutateAsync({ file, onProgress: (p: number) => console.log('progress', p) });
    const el = document.getElementById('done-marker');
    if (el) el.textContent = 'done';
  };
  return React.createElement('button', { onClick: start }, 'Start');
};

describe('useIngestUpload', () => {
  it('calls api.post when triggered (via hook)', async () => {
    renderWithProviders(React.createElement(React.Fragment, null, React.createElement(TestComponent), React.createElement('div', { id: 'done-marker' })));
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByText('Start'));
    });
    // wait for async react-query notifications and mutation to complete
    await waitFor(() => expect((require('@/lib/apiClient').default.post)).toHaveBeenCalled());
  });
});
