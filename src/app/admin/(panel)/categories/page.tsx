import { requireAdmin } from "@/lib/admin";
import { LANG_LABEL } from "@/lib/i18n";
import type { Category } from "@/lib/types";
import { deleteCategory, saveCategory } from "../../actions";

export default async function CategoriesPage() {
  const { supabase, shop } = await requireAdmin();
  const { data } = await supabase.from("categories").select("*").eq("shop_id", shop.id).order("sort").order("created_at");
  const cats = (data as Category[]) ?? [];
  const { data: counts } = await supabase.from("products").select("category_id").eq("shop_id", shop.id);
  const countOf = (id: string) => (counts ?? []).filter((p) => p.category_id === id).length;
  const langs = shop.languages;

  const row = (c?: Category) => (
    <form action={saveCategory} className="row" style={{ gap: 8, flexWrap: "wrap", padding: "10px 0", borderBottom: "1px solid #f0efee" }}>
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <input name="emoji" defaultValue={c?.emoji ?? ""} placeholder="🙂" className="input" style={{ width: 56, minHeight: 38, textAlign: "center" }} aria-label="Емодзі" />
      {langs.map((l) => (
        <input
          key={l}
          name={`name_${l}`}
          defaultValue={c?.name?.[l] ?? ""}
          placeholder={`Назва (${LANG_LABEL[l]})`}
          className="input"
          style={{ width: 200, minHeight: 38 }}
          required={l === shop.default_lang}
        />
      ))}
      <input name="sort" type="number" defaultValue={c?.sort ?? cats.length + 1} className="input" style={{ width: 70, minHeight: 38 }} aria-label="Порядок" />
      {c && (
        <label className="check">
          <input type="checkbox" name="is_active" defaultChecked={c.is_active} /> показувати
        </label>
      )}
      <button className="btn sm" style={{ background: "#1c1917" }}>{c ? "Зберегти" : "+ Додати"}</button>
      {c && <span className="muted small">{countOf(c.id)} товарів</span>}
    </form>
  );

  return (
    <>
      <h1>Категорії</h1>
      <div className="panel">
        {cats.map((c) => (
          <div key={c.id} className="row" style={{ alignItems: "start" }}>
            <div className="grow">{row(c)}</div>
            <form action={deleteCategory} style={{ paddingTop: 10 }}>
              <input type="hidden" name="id" value={c.id} />
              <button className="btn sm danger" title="Видалити (товари залишаться без категорії)">✕</button>
            </form>
          </div>
        ))}
        <div style={{ marginTop: 10 }}>
          <b className="small">Нова категорія</b>
          {row()}
        </div>
      </div>
    </>
  );
}
