import app from './index';

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

// NOOP: trigger CI run (commit timestamp 2025-10-03)
