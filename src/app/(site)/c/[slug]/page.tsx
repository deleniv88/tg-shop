import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getLang, getProducts, getShop } from "@/lib/shop";
import { toCategoryView, toProductView } from "@/lib/view";
import { CategoryChips, ProductGrid } from "@/components/catalog";
import { tr } from "@/lib/i18n";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShop();
  const lang = await getLang(shop);
  const cat = (await getCategories(shop.id)).find((c) => c.slug === slug);
  return { title: cat ? tr(cat.name, lang, shop.default_lang) : undefined };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShop();
  const lang = await getLang(shop);
  const f = shop.default_lang;
  const cats = await getCategories(shop.id);
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) notFound();
  const products = await getProducts(shop.id, { categoryId: cat.id });

  return (
    <div className="container">
      <h1 className="page-title display">
        {cat.emoji} {tr(cat.name, lang, f)}
      </h1>
      <div style={{ marginBottom: 20 }}>
        <CategoryChips cats={cats.map((c) => toCategoryView(c, lang, f))} current={slug} />
      </div>
      <ProductGrid products={products.map((p) => toProductView(p, lang, cats, f))} />
      <div style={{ height: 40 }} />
    </div>
  );
}
