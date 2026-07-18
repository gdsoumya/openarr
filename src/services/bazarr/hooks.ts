import { useCallback, useRef, useState } from 'react';
import { SubtitleSearchResult } from './types';
import { SubtitleSearchStatus } from './components/SubtitleSearchSheet';

export interface SubtitleSearch {
  visible: boolean;
  status: SubtitleSearchStatus;
  error?: string;
  title: string;
  results: SubtitleSearchResult[];
  run: (title: string, fetcher: () => Promise<SubtitleSearchResult[]>) => void;
  retry: () => void;
  dismiss: () => void;
}

export function useSubtitleSearch(): SubtitleSearch {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<SubtitleSearchStatus>('loading');
  const [error, setError] = useState<string | undefined>();
  const [title, setTitle] = useState('');
  const [results, setResults] = useState<SubtitleSearchResult[]>([]);
  const lastFetcher = useRef<(() => Promise<SubtitleSearchResult[]>) | null>(null);
  const requestId = useRef(0);

  const execute = useCallback(async (fetcher: () => Promise<SubtitleSearchResult[]>) => {
    const id = ++requestId.current;
    setStatus('loading');
    setError(undefined);
    setResults([]);
    try {
      const data = await fetcher();
      if (id !== requestId.current) return;
      setResults(data ?? []);
      setStatus('success');
    } catch (e: any) {
      if (id !== requestId.current) return;
      setError(e?.message ?? 'Search failed');
      setStatus('error');
    }
  }, []);

  const run = useCallback((searchTitle: string, fetcher: () => Promise<SubtitleSearchResult[]>) => {
    lastFetcher.current = fetcher;
    setTitle(searchTitle);
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

  return { visible, status, error, title, results, run, retry, dismiss };
}
