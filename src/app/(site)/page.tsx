import Link from "next/link";
import { getCategories, getLang, getProducts, getShop } from "@/lib/shop";
import { toCategoryView, toProductView } from "@/lib/view";
import { CategoryChips, ProductGrid } from "@/components/catalog";
import { t, tr } from "@/lib/i18n";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const shop = await getShop();
  const lang = await getLang(shop);
  const f = shop.default_lang;
  const cats = await getCategories(shop.id);
  const products = await getProducts(shop.id, { q });
  const views = products.map((p) => toProductView(p, lang, cats, f));
  const featured = views.filter((p) => p.featured);
  const catViews = cats.map((c) => toCategoryView(c, lang, f));

  return (
    <div className="container">
      {!q && (
        <section className="hero">
          <div className="eyebrow">{tr(shop.tagline, lang, f)}</div>
          <h1 className="display">{tr(shop.hero_title, lang, f) || shop.name}</h1>
          {tr(shop.hero_text, lang, f) && <p>{tr(shop.hero_text, lang, f)}</p>}
          <Link href="#catalog" className="btn accent">
            {t(lang, "toCatalog")} →
          </Link>
        </section>
      )}

      {!q && catViews.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="display">{t(lang, "categories")}</h2>
          </div>
          <div className="cat-grid">
            {catViews.map((c) => (
              <Link key={c.id} href={`/c/${c.slug}`} className="cat-card">
                <span className="emo" aria-hidden>{c.emoji}</span>
                <b>{c.name}</b>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!q && featured.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="display">{t(lang, "featured")}</h2>
          </div>
          <ProductGrid products={featured} />
        </section>
      )}

      <section className="section" id="catalog" style={{ scrollMarginTop: 90 }}>
        <div className="section-head">
          <h2 className="display">{q ? `«${q}»` : t(lang, "all")}</h2>
          <span className="muted small">{views.length}</span>
        </div>
        <div style={{ marginBottom: 16 }}>
          <CategoryChips cats={catViews} />
        </div>
        {views.length ? (
          <ProductGrid products={views} />
        ) : (
          <div className="empty">
            <div className="emo">🔍</div>
            <p className="muted">{t(lang, "emptyCartHint")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
