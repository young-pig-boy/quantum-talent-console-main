"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ApiClientError } from "./client";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await fetcherRef.current();
      setState({ data, loading: false, error: null });
      return data;
    } catch (e) {
      const message =
        e instanceof ApiClientError ? e.message : (e as Error).message || "请求失败";
      setState({ data: null, loading: false, error: message });
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { ...state, refetch: execute };
}

interface UseMutationState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

export function useMutation<T, Args extends unknown[] = []>(
  mutator: (...args: Args) => Promise<T>
) {
  const [state, setState] = useState<UseMutationState<T>>({
    loading: false,
    error: null,
    data: null,
  });

  const mutate = useCallback(async (...args: Args): Promise<T | null> => {
    setState({ loading: true, error: null, data: null });
    try {
      const data = await mutator(...args);
      setState({ loading: false, error: null, data });
      return data;
    } catch (e) {
      const message =
        e instanceof ApiClientError ? e.message : (e as Error).message || "操作失败";
      setState({ loading: false, error: message, data: null });
      return null;
    }
  }, [mutator]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  return { ...state, mutate, reset };
}
