"use client";

import { useCallback, useEffect, useState } from "react";
import { api, apiCache, errorMessage } from "./api";

interface State<T> {
  path: string | null; // the path the current data/error belongs to
  data: T | null;
  error: string | null;
}

/**
 * Loads `path` on mount and whenever it changes. `reload` refetches without clearing current data.
 * A path that was loaded before shows its last answer straight away and refreshes in the background.
 */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ path: null, data: null, error: null });

  const fetchPath = useCallback(
    () =>
      path
        ? api.get<T>(path).then(
            (data) => setState({ path, data, error: null }),
            (err) => setState((s) => ({ path, data: s.data, error: errorMessage(err) })),
          )
        : Promise.resolve(),
    [path],
  );

  useEffect(() => {
    fetchPath();
  }, [fetchPath]);

  const setData = useCallback((updater: (data: T | null) => T | null) => setState((s) => ({ ...s, data: updater(s.data) })), []);

  const fresh = state.path === path;
  const cached = !fresh && path ? ((apiCache.get(path) as T | undefined) ?? null) : null;

  return {
    data: fresh ? state.data : (cached ?? state.data),
    error: fresh ? state.error : null,
    loading: !!path && !fresh && cached === null,
    reload: fetchPath,
    setData,
  };
}
