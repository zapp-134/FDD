import { verifyModelHealth } from '../mlClient';

(async () => {
  let ok = false;
  try {
    ok = await verifyModelHealth();
    if (!ok) {
      console.warn('Preflight: model health check did not pass. Check GEMINI_MODEL/GEMINI_API_KEY or ADC.');
    } else {
      console.info('Preflight: model health check passed.');
    }
  } catch (e) {
    console.warn('Preflight: unexpected error during model health check', e);
    ok = false;
  }
  // If configured, fail container startup when model health fails. This is
  // controlled by PREVENT_START_ON_BAD_MODEL=true in env. Otherwise exit 0 so
  // preflight doesn't block startup.
  const prevent = (process.env.PREVENT_START_ON_BAD_MODEL || 'false').toLowerCase() === 'true';
  if (prevent) {
    if (!ok) {
      console.error('Preflight: PREVENT_START_ON_BAD_MODEL=true and model health failed — exiting with non-zero to stop container startup');
      process.exit(1);
    }
  }
  process.exit(0);
})();
