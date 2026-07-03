"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface CompareItem {
  handle: string;
  name: string;
  image?: string;
  price: number;
  brand?: string;
}

interface CompareApi {
  items: CompareItem[];
  has: (handle: string) => boolean;
  toggle: (item: CompareItem) => void;
  remove: (handle: string) => void;
  clear: () => void;
  isFull: boolean;
  max: number;
}

const MAX = 4;
const KEY = "acme_compare";
const Ctx = createContext<CompareApi | null>(null);

/** Returns the compare API, or null when rendered outside a CompareProvider. */
export function useCompare(): CompareApi | null {
  return useContext(Ctx);
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.slice(0, MAX));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  const has = useCallback((handle: string) => items.some((i) => i.handle === handle), [items]);
  const toggle = useCallback((item: CompareItem) => {
    setItems((cur) =>
      cur.some((i) => i.handle === item.handle)
        ? cur.filter((i) => i.handle !== item.handle)
        : cur.length >= MAX ? cur : [...cur, item],
    );
  }, []);
  const remove = useCallback((handle: string) => setItems((cur) => cur.filter((i) => i.handle !== handle)), []);
  const clear = useCallback(() => setItems([]), []);

  return (
    <Ctx.Provider value={{ items, has, toggle, remove, clear, isFull: items.length >= MAX, max: MAX }}>
      {children}
    </Ctx.Provider>
  );
}
