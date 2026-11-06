import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getLang, getProducts, getShop, getShopBySlug, themeStyle } from "@/lib/shop";
import { toCategoryView, toProductView, toShopView } from "@/lib/view";
import { ShopProvider } from "@/components/shop-context";
import { TgApp } from "@/components/tg/tg-app";

export const metadata: Metadata = { robots: { index: false } };

// Telegram Mini App. The bot opens /tg?shop=<slug>, so one deployment can serve many shops' bots.
export default async function TgPage({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const sp = await searchParams;
  const shop = sp.shop ? await getShopBySlug(sp.shop) : await getShop();
  if (!shop) notFound();
  const lang = await getLang(shop);
  const f = shop.default_lang;
  const cats = await getCategories(shop.id);
  const products = await getProducts(shop.id);
  const style = themeStyle(shop);

  return (
    <div style={{ ...style, background: "var(--bg)", minHeight: "100vh" }}>
      <ShopProvider shop={toShopView(shop, lang)}>
        <TgApp
          products={products.map((p) => toProductView(p, lang, cats, f))}
          categories={cats.map((c) => toCategoryView(c, lang, f))}
          bg={shop.theme.bg || "#f6f1e7"}
          primaryColor={shop.theme.primary || "#1f4d3a"}
        />
      </ShopProvider>
    </div>
  );
}
