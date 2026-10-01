"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "./api";

interface State<T> {
  path: string | null; // the path the current data/error belongs to
  data: T | null;
  error: string | null;
}

/** Loads `path` on mount and whenever it changes. `reload` refetches without clearing current data. */
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

  return {
    data: state.data,
    error: state.path === path ? state.error : null,
    loading: !!path && state.path !== path,
    reload: fetchPath,
    setData,
  };
}
