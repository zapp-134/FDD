import '@testing-library/jest-dom';

// Provide a lightweight shim for Vite import.meta.env values used in the app.
// Tests can rely on globalThis.__VITE_MOCK_ENV__ if needed.
// This avoids runtime errors when components read import.meta.env during tests.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.__VITE_MOCK_ENV__ = { VITE_USE_REMOTE_API: 'false' };

// Mock the toast hook globally so tests don't need per-test mocks and to avoid act warnings.
// The real module exports `useToast` (named) and `toast` — provide matching shapes.
jest.mock('@/hooks/use-toast', () => ({
	__esModule: true,
	useToast: () => ({ toast: jest.fn(), dismiss: jest.fn() }),
	toast: jest.fn(),
}));

// Mock api client globally to avoid network calls in unit tests.
jest.mock('@/lib/apiClient', () => ({
	__esModule: true,
	default: {
		post: jest.fn().mockResolvedValue({ data: { ingestId: '123' } }),
		get: jest.fn().mockResolvedValue({ data: {} }),
	},
}));

// Provide a helper to read mocked Vite env values if a module reads import.meta.env directly.
Object.defineProperty(globalThis, 'import', { value: undefined, configurable: true });

