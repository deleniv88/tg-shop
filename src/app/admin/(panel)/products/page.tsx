import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { money, toMajor } from "@/lib/money";
import { tr } from "@/lib/i18n";
import type { Category, Product } from "@/lib/types";
import { quickUpdateProduct, toggleProduct } from "../../actions";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const { q, cat } = await searchParams;
  const { supabase, shop } = await requireAdmin();
  const L = shop.default_lang;

  const { data: c } = await supabase.from("categories").select("*").eq("shop_id", shop.id).order("sort");
  const cats = (c as Category[]) ?? [];
  let query = supabase.from("products").select("*").eq("shop_id", shop.id).order("sort").order("created_at");
  if (cat) query = query.eq("category_id", cat);
  const { data } = await query;
  let products = (data as Product[]) ?? [];
  if (q) {
    const s = q.toLowerCase();
    products = products.filter((p) => Object.values(p.name).some((n) => n?.toLowerCase().includes(s)) || p.sku?.toLowerCase().includes(s));
  }

  return (
    <>
      <div className="row between" style={{ marginBottom: 18, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Товари <span className="muted" style={{ fontSize: 16 }}>{products.length}</span></h1>
        <div className="row">
          <Link href="/admin/products/import" className="btn ghost">Імпорт CSV</Link>
          <Link href="/admin/products/new" className="btn" style={{ background: "#1c1917" }}>+ Додати товар</Link>
        </div>
      </div>

      <form className="row" style={{ marginBottom: 14, flexWrap: "wrap" }}>
        <input name="q" defaultValue={q} placeholder="Пошук за назвою або SKU" className="input" style={{ maxWidth: 320, minHeight: 40 }} />
        <select name="cat" defaultValue={cat ?? ""} className="input" style={{ maxWidth: 220, minHeight: 40 }}>
          <option value="">Усі категорії</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {tr(c.name, L)}</option>
          ))}
        </select>
        <button className="btn ghost">Фільтр</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Назва</th>
              <th>Категорія</th>
              <th>Ціна, {shop.currency}</th>
              <th>Залишок</th>
              <th></th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const category = cats.find((c) => c.id === p.category_id);
              return (
                <tr key={p.id}>
                  <td style={{ width: 56 }}>
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="thumb" src={p.images[0]} alt="" />
                    ) : (
                      <span className="thumb">{category?.emoji ?? "🛍️"}</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/products/${p.id}`}>
                      <b>{tr(p.name, L)}</b>
                      <div className="muted small">{[p.sku, p.unit].filter(Boolean).join(" · ")}</div>
                    </Link>
                  </td>
                  <td className="muted">{category ? tr(category.name, L) : "—"}</td>
                  <td colSpan={3}>
                    <form action={quickUpdateProduct} className="row" style={{ gap: 6 }}>
                      <input type="hidden" name="id" value={p.id} />
                      <input name="price" defaultValue={toMajor(p.price)} className="input" style={{ width: 96, minHeight: 34 }} aria-label="Ціна" />
                      <input name="stock" defaultValue={p.stock ?? ""} placeholder="∞" className="input" style={{ width: 76, minHeight: 34 }} aria-label="Залишок" />
                      <button className="btn sm ghost" title="Зберегти ціну й залишок">✓</button>
                      {p.compare_at_price ? <span className="muted small">було {money(p.compare_at_price, shop.currency, "uk")}</span> : null}
                    </form>
                  </td>
                  <td>
                    <form action={toggleProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={p.is_active ? "0" : "1"} />
                      <button className={`pill ${p.is_active ? "confirmed" : "cancelled"}`} style={{ border: 0, cursor: "pointer" }}>
                        {p.is_active ? "Показано" : "Приховано"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {!products.length && (
              <tr>
                <td colSpan={7} className="center muted" style={{ padding: 40 }}>Товарів не знайдено</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted small">Порожній залишок означає, що кількість не відстежується (товар завжди в наявності).</p>
    </>
  );
}
