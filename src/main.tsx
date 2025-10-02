import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// expose Vite env values at runtime to avoid using import.meta in component module scope
// Tests can set globalThis.__VITE_USE_REMOTE_API to control behavior
if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
	// Vite will replace import.meta.env during build; keep as string for tests
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	globalThis.__VITE_USE_REMOTE_API = String((import.meta as any).env.VITE_USE_REMOTE_API ?? 'false');
}

createRoot(document.getElementById("root")!).render(<App />);
