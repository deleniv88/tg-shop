import { tr } from "./i18n";
import type { Category, Lang, Product, Shop } from "./types";

/** What the browser needs to render a product. Built on the server in the visitor's language. */
export type ProductView = {
  id: string;
  slug: string;
  name: string;
  unit: string | null;
  price: number;
  compareAt: number | null;
  stock: number | null;
  image: string | null;
  images: string[];
  emoji: string | null;
  categoryId: string | null;
  featured: boolean;
  adult: boolean;
  description: string;
  ingredients: string;
  allergens: string;
};

export type CategoryView = { id: string; slug: string; name: string; emoji: string | null };

export type ShopView = {
  id: string;
  slug: string;
  name: string;
  currency: string;
  lang: Lang;
  languages: Lang[];
  logo: string | null;
  tagline: string;
  heroTitle: string;
  heroText: string;
  minOrder: number;
  deliveryFee: number;
  freeFrom: number | null;
  deliveryNote: string;
  paymentMethods: Shop["payment_methods"];
  support: string | null;
  isOpen: boolean;
};

export function toProductView(p: Product, lang: Lang, cats: Category[], fallback: Lang): ProductView {
  const cat = cats.find((c) => c.id === p.category_id);
  return {
    id: p.id,
    slug: p.slug,
    name: tr(p.name, lang, fallback),
    unit: p.unit,
    price: p.price,
    compareAt: p.compare_at_price && p.compare_at_price > p.price ? p.compare_at_price : null,
    stock: p.stock,
    image: p.images?.[0] ?? null,
    images: p.images ?? [],
    emoji: cat?.emoji ?? "🛍️",
    categoryId: p.category_id,
    featured: p.is_featured,
    adult: p.is_18plus,
    description: tr(p.description, lang, fallback),
    ingredients: tr(p.ingredients, lang, fallback),
    allergens: tr(p.allergens, lang, fallback),
  };
}

export function toCategoryView(c: Category, lang: Lang, fallback: Lang): CategoryView {
  return { id: c.id, slug: c.slug, name: tr(c.name, lang, fallback), emoji: c.emoji };
}

export function toShopView(s: Shop, lang: Lang): ShopView {
  const f = s.default_lang;
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    currency: s.currency,
    lang,
    languages: s.languages,
    logo: s.logo_url,
    tagline: tr(s.tagline, lang, f),
    heroTitle: tr(s.hero_title, lang, f),
    heroText: tr(s.hero_text, lang, f),
    minOrder: s.min_order,
    deliveryFee: s.delivery_fee,
    freeFrom: s.free_delivery_from,
    deliveryNote: tr(s.delivery_note, lang, f),
    paymentMethods: s.payment_methods,
    support: s.support_username,
    isOpen: s.is_open,
  };
}
