import { useCallback, useRef, useState } from 'react';
import { Release } from './types';

export type ReleaseSearchStatus = 'loading' | 'success' | 'error';

export interface ReleaseSearchContext {
  type: 'episode' | 'season' | 'movie';
  label: string;
}

export interface ReleaseSearch {
  visible: boolean;
  status: ReleaseSearchStatus;
  error?: string;
  releases: Release[];
  context?: ReleaseSearchContext;
  run: (context: ReleaseSearchContext, fetcher: () => Promise<Release[]>) => void;
  retry: () => void;
  dismiss: () => void;
}

export function useReleaseSearch(): ReleaseSearch {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<ReleaseSearchStatus>('loading');
  const [error, setError] = useState<string | undefined>();
  const [releases, setReleases] = useState<Release[]>([]);
  const [context, setContext] = useState<ReleaseSearchContext | undefined>();
  const lastFetcher = useRef<(() => Promise<Release[]>) | null>(null);
  const requestId = useRef(0);

  const execute = useCallback(async (fetcher: () => Promise<Release[]>) => {
    const id = ++requestId.current;
    setStatus('loading');
    setError(undefined);
    setReleases([]);
    try {
      const result = await fetcher();
      if (id !== requestId.current) return;
      setReleases(result);
      setStatus('success');
    } catch (e: any) {
      if (id !== requestId.current) return;
      setError(e?.message ?? 'Search failed');
      setStatus('error');
    }
  }, []);

  const run = useCallback((ctx: ReleaseSearchContext, fetcher: () => Promise<Release[]>) => {
    lastFetcher.current = fetcher;
    setContext(ctx);
    setVisible(true);
    execute(fetcher);
  }, [execute]);

  const retry = useCallback(() => {
    if (lastFetcher.current) execute(lastFetcher.current);
  }, [execute]);

  const dismiss = useCallback(() => {
    requestId.current++;
    setVisible(false);
  }, []);

  return { visible, status, error, releases, context, run, retry, dismiss };
}
