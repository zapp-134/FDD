/* LABELED_BY_TOOL
 * File: src/components/JobLogs.tsx
 * Inferred role: Frontend source (React + Vite)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface JobLogsProps {
  jobId?: string | null;
  // optional override so parent can force the exact API base used for EventSource
  apiBaseOverride?: string | null;
}

export const JobLogs = ({ jobId, apiBaseOverride }: JobLogsProps) => {
  const [lines, setLines] = useState<string[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<number>(0);
  const finishedRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { apiBaseUrl: apiBaseFromContext } = useApp();
  const retryTimerRef = useRef<number | null>(null);
  const pendingCloseRef = useRef<number | null>(null);
  const lastDoneAtRef = useRef<number | null>(null);
  const activeRef = useRef<boolean>(false);

  useEffect(() => {
    // clean up previous connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setLines([]);

    if (!jobId) return;

    retryRef.current = 0;
  finishedRef.current = false;

    const makeUrl = () => {
      // prefer explicit override from props (Upload passes this), otherwise use context
      const apiBase = (apiBaseOverride ?? apiBaseFromContext) || '';
      const base = apiBase.replace(/\/\/+$/, '');
      if (base) return `${base}/jobs/${jobId}/stream`;
      return `/api/jobs/${jobId}/stream`;
    };

    const createEventSource = () => {
      // idempotent: if this mount already has an active ES, don't proceed
      if (activeRef.current) return;
      // if we already finished the stream, don't create a new EventSource
      if (finishedRef.current) return;
        const url = makeUrl();
        // Use a shared EventSource per jobId to avoid duplicate connections (React StrictMode mounts twice)
        const G = (window as any).__FDD_SSE__ = (window as any).__FDD_SSE__ || {};
        let shared = G[jobId];
        if (!shared) {
          // create new shared EventSource
          const es = new EventSource(url);
          shared = { es, count: 0 };
          G[jobId] = shared;
        }
        // idempotent: if this mount already has an active ES, don't proceed
        if (activeRef.current) return;
        // log connecting only when we're actually going to attach
        // debug: print the api base and final url the EventSource will use
        // eslint-disable-next-line no-console
        const debugApiBase = apiBaseOverride ?? apiBaseFromContext;
        console.debug('JobLogs connecting, apiBase=', debugApiBase, ' -> url=', url);
        setLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] connecting to ${url}`]);
        try {
          activeRef.current = true;
          const es = shared.es;
          esRef.current = es;

          const onJob = (ev: MessageEvent) => {
            try {
              const data = JSON.parse(ev.data);
              const entry = `[${new Date().toLocaleTimeString()}] status=${data.status} progress=${data.progress}%`;
              setLines((prev) => [...prev, entry]);
            } catch (err) {
              setLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${ev.data}`]);
            }
          };
          es.addEventListener('job', onJob);

          const onDone = (ev: MessageEvent) => {
            setLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] processing finished`]);
            // mark finished; we don't close shared EventSource here because others may be using it
            finishedRef.current = true;
            // record when the final done arrived so onerror racing with done can be ignored briefly
            try { lastDoneAtRef.current = Date.now(); } catch (e) {}
            // clear any scheduled reconnect attempts
            try {
              if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current as unknown as number);
                retryTimerRef.current = null;
              }
            } catch (e) {
              // ignore
            }
            // clear any pending close timer so we don't trigger reconnect after done
            try {
              if (pendingCloseRef.current) {
                clearTimeout(pendingCloseRef.current as unknown as number);
                pendingCloseRef.current = null;
              }
            } catch (e) {
              // ignore
            }

            // If this is the only subscriber for the shared EventSource, close it so the browser
            // doesn't automatically reconnect after the server closes the stream.
            try {
              const G3 = (window as any).__FDD_SSE__ || {};
              const s3 = G3[jobId];
              if (s3) {
                const count = s3.count || 0;
                if (count <= 1) {
                  try { s3.es.close(); } catch (e) {}
                  try { delete G3[jobId]; } catch (e) {}
                }
              }
            } catch (e) {
              // ignore
            }
          };
          es.addEventListener('done', onDone);

          const onServerError = (ev: any) => {
            if (ev && typeof ev.data === 'string' && ev.data.length > 0) {
              setLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: ${ev.data}`]);
            }
            // otherwise it's likely a network-level error which onerror will handle
          };
          es.addEventListener('error', onServerError);

          const onOpen = () => {
            retryRef.current = 0;
            setLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] connected to logs`]);
          };
          es.addEventListener('open', onOpen as any);

          const onError = () => {
            setLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] connection error`]);

            // If we already received a final "done" event, don't attempt to reconnect.
            if (finishedRef.current) {
              setLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] stream finished, not reconnecting`]);
              return;
            }

            // If a 'done' event arrived very recently, the browser may report an error during the final close.
            // Ignore this onerror if it occurs within a small grace window after done.
            try {
              const last = lastDoneAtRef.current;
              if (last && Date.now() - last < 1500) {
                setLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] recent done detected, ignoring transient error`]);
                return;
              }
            } catch (e) {}

            // schedule a short pending close/reconnect to allow a near-simultaneous 'done' event to arrive
            try {
              if (pendingCloseRef.current) {
                clearTimeout(pendingCloseRef.current as unknown as number);
              }
            } catch (e) {
              // ignore
            }
            const pendingMs = 700; // wait 700ms before closing to reduce race with 'done'
            pendingCloseRef.current = window.setTimeout(() => {
              pendingCloseRef.current = null;

              // close current EventSource only when no other subscribers
              try {
                // decrement shared usage and close if last
                const G2 = (window as any).__FDD_SSE__ || {};
                const s2 = G2[jobId];
                if (s2) {
                  // if multiple components are listening, we shouldn't fully close here
                  // schedule reconnect will be handled by this mount's retry timer
                }
              } catch (e) {}

              // schedule reconnect with exponential backoff
              if (finishedRef.current) {
                setLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] stream finished, not reconnecting`]);
                return;
              }
              const retryMs = Math.min(30000, 1000 * 2 ** retryRef.current);
              retryRef.current += 1;
              setLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] retrying in ${retryMs / 1000}s`]);
              retryTimerRef.current = window.setTimeout(() => {
                retryTimerRef.current = null;
                if (jobId && !finishedRef.current) createEventSource();
              }, retryMs);
            }, pendingMs);
          };
          es.addEventListener('error', onError as any);

    // keep a record of listener functions so we can remove them on cleanup
    const listeners = { onJob, onDone, onServerError, onOpen, onError } as any;
    // increment usage count
    shared.count = (shared.count || 0) + 1;
    // remember local detach for cleanup
    (esRef as any).listeners = listeners;
    // mark active for this mount
    activeRef.current = true;
        } catch (err) {
          setLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: ${String(err)}`]);
          const retryMs = Math.min(30000, 1000 * 2 ** retryRef.current);
          retryRef.current += 1;
          setTimeout(() => {
            if (jobId) createEventSource();
          }, retryMs);
        }
    };

    // cleanup helper to detach listeners and mark inactive
      const detach = () => {
        try {
        if (esRef.current) {
          const l = (esRef as any).listeners;
          if (l) {
            try { esRef.current.removeEventListener('job', l.onJob); } catch (e) {}
            try { esRef.current.removeEventListener('done', l.onDone); } catch (e) {}
            try { esRef.current.removeEventListener('error', l.onServerError); } catch (e) {}
            try { esRef.current.removeEventListener('open', l.onOpen); } catch (e) {}
            try { esRef.current.removeEventListener('error', l.onError); } catch (e) {}
          }
          // decrement shared count and possibly close shared ES when no more listeners
          try {
            const G = (window as any).__FDD_SSE__ || {};
            const s = G[jobId];
            if (s) {
              s.count = (s.count || 1) - 1;
              if (s.count <= 0) {
                try { s.es.close(); } catch (e) {}
                delete G[jobId];
              }
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {}
      activeRef.current = false;
      };

    createEventSource();

    return () => {
      try {
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
      } catch (e) {
        // non-fatal cleanup error
        // eslint-disable-next-line no-console
        console.warn('Error closing EventSource', e);
      }
    };
  }, [jobId, apiBaseOverride, apiBaseFromContext]);

  useEffect(() => {
    // auto-scroll
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  if (!jobId) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Live processing logs</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="h-48 overflow-auto font-mono text-sm bg-black/5 p-2 rounded">
          {lines.map((l, i) => (
            <div key={`${i}-${l.slice(0,40)}`} className="whitespace-pre-wrap">{l}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default JobLogs;
