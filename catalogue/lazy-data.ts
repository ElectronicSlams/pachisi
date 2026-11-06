import { useEffect, useState } from 'react';

export type LazyData<T> = { readonly data: T | undefined; readonly failed: boolean };

/**
 * Research JSON (census, GitHub sweep, public sources, coverage) is large and below the
 * fold, so it loads through import() into its own chunk instead of the catalogue entry.
 * Each resource loads once; later mounts read the cached value synchronously.
 */
export function lazyData<T>(load: () => Promise<{ readonly default: T }>) {
  let value: T | undefined;
  let failed = false;
  let pending: Promise<void> | undefined;
  const start = () => pending ??= load().then(module => { value = module.default; }, () => { failed = true; });
  return function useLazyData(): LazyData<T> {
    const [, setSettled] = useState(value !== undefined || failed);
    useEffect(() => {
      if (value !== undefined || failed) return;
      let live = true;
      void start().then(() => { if (live) setSettled(true); });
      return () => { live = false; };
    }, []);
    return { data: value, failed };
  };
}

export const useCensus = lazyData(() => import('./local-game-design-census.json'));
export const useGitHubSweep = lazyData(() => import('./github-visual-sweep.json'));
export const usePublicDesignSources = lazyData(() => import('./public-design-sources.json'));
export const useGameCoverage = lazyData(() => import('../docs/game-coverage.json'));
