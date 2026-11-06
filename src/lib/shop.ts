import "server-only";
import { cache, type CSSProperties } from "react";
import { cookies, headers } from "next/headers";
import { db } from "./supabase/admin";
import type { Category, Lang, Product, Shop } from "./types";

const SHOP_COLUMNS = "*";

export const getShopBySlug = cache(async (slug: string): Promise<Shop | null> => {
  const { data } = await db().from("shops").select(SHOP_COLUMNS).eq("slug", slug).maybeSingle();
  return (data as Shop) ?? null;
});

export const getShopById = cache(async (id: string): Promise<Shop | null> => {
  const { data } = await db().from("shops").select(SHOP_COLUMNS).eq("id", id).maybeSingle();
  return (data as Shop) ?? null;
});

/**
 * Resolve the current shop: by request host (shops.domains), then DEFAULT_SHOP_SLUG.
 * One deployment can serve many shops this way.
 */
export const getShop = cache(async (): Promise<Shop> => {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(":")[0].toLowerCase();
  if (host) {
    const { data } = await db().from("shops").select(SHOP_COLUMNS).contains("domains", [host]).maybeSingle();
    if (data) return data as Shop;
  }
  const slug = process.env.DEFAULT_SHOP_SLUG || "demo";
  const shop = await getShopBySlug(slug);
  if (!shop) throw new Error(`Shop "${slug}" not found. Run supabase/seed.sql or set DEFAULT_SHOP_SLUG.`);
  return shop;
});

export async function getLang(shop: Shop): Promise<Lang> {
  const c = (await cookies()).get("lang")?.value as Lang | undefined;
  return c && shop.languages.includes(c) ? c : shop.default_lang;
}

export const getCategories = cache(async (shopId: string): Promise<Category[]> => {
  const { data } = await db()
    .from("categories")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("sort")
    .order("created_at");
  return (data as Category[]) ?? [];
});

export async function getProducts(
  shopId: string,
  opts: { categoryId?: string; featured?: boolean; q?: string } = {},
): Promise<Product[]> {
  let query = db().from("products").select("*").eq("shop_id", shopId).eq("is_active", true);
  if (opts.categoryId) query = query.eq("category_id", opts.categoryId);
  if (opts.featured) query = query.eq("is_featured", true);
  const { data } = await query.order("sort").order("created_at");
  let list = (data as Product[]) ?? [];
  if (opts.q) {
    const q = opts.q.toLowerCase();
    list = list.filter((p) =>
      [...Object.values(p.name), p.sku ?? "", ...Object.values(p.description)].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      ),
    );
  }
  return list;
}

export async function getProduct(shopId: string, slug: string): Promise<Product | null> {
  const { data } = await db()
    .from("products")
    .select("*")
    .eq("shop_id", shopId)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as Product) ?? null;
}

/** Public URL used for Telegram buttons: first real domain of the shop, else NEXT_PUBLIC_SITE_URL. */
export function shopBaseUrl(shop: Shop): string {
  const domain = shop.domains.find((d) => d && d !== "localhost");
  if (domain) return `https://${domain}`;
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function themeStyle(shop: Shop): CSSProperties {
  const t = shop.theme ?? {};
  return {
    ["--primary" as string]: t.primary || "#1f4d3a",
    ["--accent" as string]: t.accent || "#e8b04a",
    ["--bg" as string]: t.bg || "#f6f1e7",
    ["--surface" as string]: t.surface || "#ffffff",
    ["--text" as string]: t.text || "#1c2420",
    ["--radius" as string]: t.radius || "14px",
  };
}
