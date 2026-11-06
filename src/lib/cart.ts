"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { CartLine } from "./types";

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: CartLine[] }>();
const EMPTY: CartLine[] = [];

const key = (shop: string) => `cart:${shop}`;

function read(shop: string): CartLine[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key(shop));
  } catch {
    raw = null;
  }
  const hit = cache.get(shop);
  if (hit && hit.raw === raw) return hit.value;
  let value: CartLine[] = EMPTY;
  try {
    value = raw ? (JSON.parse(raw) as CartLine[]) : EMPTY;
  } catch {
    value = EMPTY;
  }
  cache.set(shop, { raw, value });
  return value;
}

function write(shop: string, lines: CartLine[]) {
  try {
    window.localStorage.setItem(key(shop), JSON.stringify(lines));
  } catch {
    // storage unavailable (private mode) — keep in memory only
    cache.set(shop, { raw: null, value: lines });
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key?.startsWith("cart:") && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(shop: string) {
  const lines = useSyncExternalStore(
    subscribe,
    () => read(shop),
    () => EMPTY,
  );

  const setQty = useCallback(
    (line: Omit<CartLine, "qty">, qty: number) => {
      const current = read(shop);
      const max = line.stock ?? 999;
      const q = Math.max(0, Math.min(qty, max));
      const rest = current.filter((l) => l.id !== line.id);
      const next = q > 0 ? [...rest, { ...line, qty: q }] : rest;
      // keep original order
      const ordered = current.some((l) => l.id === line.id)
        ? current.map((l) => (l.id === line.id ? { ...line, qty: q } : l)).filter((l) => l.qty > 0)
        : next;
      write(shop, ordered);
    },
    [shop],
  );

  const add = useCallback(
    (line: Omit<CartLine, "qty">, qty = 1) => {
      const existing = read(shop).find((l) => l.id === line.id);
      setQty(line, (existing?.qty ?? 0) + qty);
    },
    [shop, setQty],
  );

  const clear = useCallback(() => write(shop, []), [shop]);

  const summary = useMemo(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
    return { count, subtotal };
  }, [lines]);

  const qtyOf = useCallback((id: string) => lines.find((l) => l.id === id)?.qty ?? 0, [lines]);

  return { lines, add, setQty, clear, qtyOf, ...summary };
}
