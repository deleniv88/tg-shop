import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { toMajor } from "@/lib/money";
import { LANG_LABEL, tr } from "@/lib/i18n";
import type { Category, Product } from "@/lib/types";
import { deleteProduct, saveProduct } from "../../../actions";

const ERRORS: Record<string, string> = {
  required: "Заповніть назву та ціну.",
  slug: "Товар з таким slug уже існує — змініть його.",
  save: "Не вдалося зберегти. Спробуйте ще раз.",
};

export default async function ProductForm({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string; saved?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, shop } = await requireAdmin();
  const isNew = id === "new";
  let p: Product | null = null;
  if (!isNew) {
    const { data } = await supabase.from("products").select("*").eq("id", id).eq("shop_id", shop.id).maybeSingle();
    if (!data) notFound();
    p = data as Product;
  }
  const { data: c } = await supabase.from("categories").select("*").eq("shop_id", shop.id).order("sort");
  const cats = (c as Category[]) ?? [];
  const langs = shop.languages;
  const L = shop.default_lang;

  const l10nField = (prefix: "name" | "description" | "ingredients" | "allergens", label: string, textarea = false, required = false) => (
    <div className="stack" style={{ gap: 8 }}>
      {langs.map((l) => (
        <div className="field" key={l}>
          <label htmlFor={`${prefix}_${l}`}>
            {label} <small>({LANG_LABEL[l]})</small>
            {required && l === L ? " *" : ""}
          </label>
          {textarea ? (
            <textarea id={`${prefix}_${l}`} name={`${prefix}_${l}`} defaultValue={p?.[prefix]?.[l] ?? ""} />
          ) : (
            <input id={`${prefix}_${l}`} name={`${prefix}_${l}`} defaultValue={p?.[prefix]?.[l] ?? ""} required={required && l === L} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Link href="/admin/products" className="muted small">← Товари</Link>
      <h1 style={{ marginTop: 4 }}>{isNew ? "Новий товар" : tr(p!.name, L)}</h1>
      {sp.e && <div className="alert" style={{ marginBottom: 14 }}>{ERRORS[sp.e] ?? ERRORS.save}</div>}
      {sp.saved && <div className="alert ok" style={{ marginBottom: 14 }}>Збережено ✓</div>}

      <form action={saveProduct} className="admin-grid">
        <input type="hidden" name="id" value={p?.id ?? ""} />
        <div className="stack" style={{ gap: 16 }}>
          <div className="panel stack">{l10nField("name", "Назва", false, true)}</div>
          <div className="panel stack">{l10nField("description", "Опис", true)}</div>
          <div className="panel stack">
            {l10nField("ingredients", "Склад", true)}
            {l10nField("allergens", "Алергени")}
          </div>

          <div className="panel stack">
            <b>Фото</b>
            {p?.images.length ? (
              <div className="img-grid">
                {p.images.map((src) => (
                  <figure key={src}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" />
                    <label className="check">
                      <input type="checkbox" name="keep_image" value={src} defaultChecked /> залишити
                    </label>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="muted small">Фото ще немає. Без фото показується емодзі категорії.</div>
            )}
            <div className="field">
              <label htmlFor="images">Завантажити фото <small>(JPG/PNG/WebP, до 4 МБ кожне)</small></label>
              <input id="images" name="images" type="file" accept="image/*" multiple />
            </div>
            <div className="field">
              <label htmlFor="image_urls">Або посилання на фото <small>(кожне з нового рядка)</small></label>
              <textarea id="image_urls" name="image_urls" placeholder="https://…" style={{ minHeight: 60 }} />
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="panel stack">
            <div className="field">
              <label htmlFor="price">Ціна, {shop.currency} *</label>
              <input id="price" name="price" inputMode="decimal" defaultValue={toMajor(p?.price)} required placeholder="12.90" />
            </div>
            <div className="field">
              <label htmlFor="compare_at_price">Стара ціна <small>(для акції)</small></label>
              <input id="compare_at_price" name="compare_at_price" inputMode="decimal" defaultValue={toMajor(p?.compare_at_price)} />
            </div>
            <div className="field">
              <label htmlFor="stock">Залишок <small>(порожньо = не відстежувати)</small></label>
              <input id="stock" name="stock" inputMode="numeric" defaultValue={p?.stock ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="unit">Фасування</label>
              <input id="unit" name="unit" defaultValue={p?.unit ?? ""} placeholder="500 г, 1 л, 6 шт." />
            </div>
          </div>

          <div className="panel stack">
            <div className="field">
              <label htmlFor="category_id">Категорія</label>
              <select id="category_id" name="category_id" defaultValue={p?.category_id ?? ""}>
                <option value="">Без категорії</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {tr(c.name, L)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sku">SKU</label>
              <input id="sku" name="sku" defaultValue={p?.sku ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="slug">Адреса (slug) <small>(створюється з назви)</small></label>
              <input id="slug" name="slug" defaultValue={p?.slug ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="sort">Порядок</label>
              <input id="sort" name="sort" type="number" defaultValue={p?.sort ?? 0} />
            </div>
            <label className="check"><input type="checkbox" name="is_active" defaultChecked={p?.is_active ?? true} /> Показувати в магазині</label>
            <label className="check"><input type="checkbox" name="is_featured" defaultChecked={p?.is_featured ?? false} /> Популярне (на головній)</label>
            <label className="check"><input type="checkbox" name="is_18plus" defaultChecked={p?.is_18plus ?? false} /> Тільки 18+</label>
          </div>

          <button className="btn block" style={{ background: "#1c1917", height: 46 }}>Зберегти</button>
          {p && (
            <Link href={`/p/${p.slug}`} target="_blank" className="btn ghost block">↗ Подивитися на сайті</Link>
          )}
        </div>
      </form>

      {p && (
        <form action={deleteProduct} style={{ marginTop: 24 }}>
          <input type="hidden" name="id" value={p.id} />
          <button className="btn danger sm">Видалити товар</button>
        </form>
      )}
    </>
  );
}
