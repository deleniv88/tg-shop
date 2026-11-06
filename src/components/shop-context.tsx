"use client";

import { createContext, useContext } from "react";
import type { ShopView } from "@/lib/view";
import { t, type TKey } from "@/lib/i18n";
import { money } from "@/lib/money";
import { useCart } from "@/lib/cart";

const Ctx = createContext<ShopView | null>(null);

export function ShopProvider({ shop, children }: { shop: ShopView; children: React.ReactNode }) {
  return <Ctx.Provider value={shop}>{children}</Ctx.Provider>;
}

export function useShop() {
  const shop = useContext(Ctx);
  if (!shop) throw new Error("useShop outside ShopProvider");
  const tt = (key: TKey, vars?: Record<string, string | number>) => t(shop.lang, key, vars);
  const fmt = (minor: number) => money(minor, shop.currency, shop.lang);
  return { shop, t: tt, fmt };
}

export function useShopCart() {
  const { shop } = useShop();
  return useCart(shop.slug);
}
