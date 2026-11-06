import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getLang, getProduct, getProducts, getShop } from "@/lib/shop";
import { toProductView } from "@/lib/view";
import { ProductDetail } from "@/components/product-detail";
import { ProductGrid } from "@/components/catalog";
import { t, tr } from "@/lib/i18n";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShop();
  const lang = await getLang(shop);
  const p = await getProduct(shop.id, slug);
  if (!p) return {};
  return {
    title: tr(p.name, lang, shop.default_lang),
    description: tr(p.description, lang, shop.default_lang),
    openGraph: p.images[0] ? { images: [p.images[0]] } : undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShop();
  const lang = await getLang(shop);
  const f = shop.default_lang;
  const product = await getProduct(shop.id, slug);
  if (!product) notFound();
  const cats = await getCategories(shop.id);
  const cat = cats.find((c) => c.id === product.category_id);
  const related = product.category_id
    ? (await getProducts(shop.id, { categoryId: product.category_id })).filter((p) => p.id !== product.id).slice(0, 4)
    : [];

  return (
    <div className="container">
      <div className="row small muted" style={{ marginTop: 20 }}>
        <Link href="/">{shop.name}</Link>
        {cat && (
          <>
            <span>/</span>
            <Link href={`/c/${cat.slug}`}>{tr(cat.name, lang, f)}</Link>
          </>
        )}
      </div>
      <ProductDetail p={toProductView(product, lang, cats, f)} />
      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="display">{cat ? tr(cat.name, lang, f) : t(lang, "all")}</h2>
          </div>
          <ProductGrid products={related.map((p) => toProductView(p, lang, cats, f))} />
        </section>
      )}
    </div>
  );
}
