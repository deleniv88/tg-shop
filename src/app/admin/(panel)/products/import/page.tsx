import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { importCsv } from "../../../actions";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ ok?: string; failed?: string; e?: string }> }) {
  const sp = await searchParams;
  const { shop } = await requireAdmin();
  const cols = [
    "slug", "sku", "category",
    ...shop.languages.flatMap((l) => [`name_${l}`, `description_${l}`]),
    "unit", "price", "compare_at_price", "stock", "is_active", "is_featured", "image_url",
  ];
  const example: Record<string, string> = {
    slug: "rye-bread", sku: "SD-001", category: "Хліб", name_uk: "Хліб житній", name_pl: "Chleb żytni",
    unit: "700 г", price: "12.90", stock: "30", is_active: "1", is_featured: "1", image_url: "https://example.com/bread.jpg",
  };
  const sample = [cols.join(","), cols.map((c) => example[c] ?? "").join(",")].join("\n");

  return (
    <>
      <Link href="/admin/products" className="muted small">← Товари</Link>
      <h1 style={{ marginTop: 4 }}>Імпорт товарів з CSV</h1>
      {sp.ok !== undefined && (
        <div className="alert ok" style={{ marginBottom: 14 }}>
          Імпортовано: {sp.ok}. {Number(sp.failed) > 0 && <>Пропущено рядків: {sp.failed} (немає назви або ціни).</>}
        </div>
      )}
      {sp.e && <div className="alert" style={{ marginBottom: 14 }}>Оберіть CSV-файл.</div>}

      <div className="admin-grid">
        <form action={importCsv} className="panel stack">
          <div className="field">
            <label htmlFor="file">CSV-файл <small>(UTF-8, роздільник кома або крапка з комою)</small></label>
            <input id="file" name="file" type="file" accept=".csv,text/csv" required />
          </div>
          <button className="btn" style={{ background: "#1c1917" }}>Імпортувати</button>
          <p className="muted small" style={{ margin: 0 }}>
            Товари з однаковим <code>slug</code> оновлюються, нові додаються. Якщо категорії немає, вона створиться
            автоматично. Ціни вказуйте як <code>12.90</code> або <code>12,90</code>.
          </p>
        </form>
        <div className="panel stack">
          <b>Колонки</b>
          <div className="small muted">Обов&apos;язкові: назва (<code>name_{shop.default_lang}</code>) і <code>price</code>.</div>
          <pre className="small" style={{ whiteSpace: "pre-wrap", background: "#fafaf9", padding: 12, borderRadius: 8, margin: 0, overflowX: "auto" }}>{sample}</pre>
          <div className="small muted">Excel: «Файл → Зберегти як → CSV UTF-8».</div>
        </div>
      </div>
    </>
  );
}
