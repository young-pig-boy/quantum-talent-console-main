"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

export function useQueryParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const getParam = useCallback((key: string, fallback = "") => searchParams.get(key) ?? fallback, [searchParams]);

  const setParams = useCallback(
    (updates: Record<string, string | number | null | undefined>, options?: { replace?: boolean; scroll?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      const url = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      if (options?.replace) {
        router.replace(url, { scroll: options.scroll ?? false });
      } else {
        router.push(url, { scroll: options?.scroll ?? false });
      }
    },
    [pathname, router, searchParams]
  );

  return { searchParams, getParam, setParams };
}
