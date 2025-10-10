import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// expose Vite env values at runtime to avoid using import.meta in component module scope
// Tests can set globalThis.__VITE_USE_REMOTE_API to control behavior
if (typeof import.meta !== 'undefined') {
	// Vite will replace import.meta.env during build; keep as string for tests
	const meta = import.meta as unknown as { env?: Record<string, string> };
	globalThis.__VITE_USE_REMOTE_API = String(meta.env?.VITE_USE_REMOTE_API ?? 'false');
}

createRoot(document.getElementById("root")!).render(<App />);
