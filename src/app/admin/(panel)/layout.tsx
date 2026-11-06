import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { signOut, switchShop } from "../actions";
import { AdminNav } from "./nav";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { shop, shops, user } = await requireAdmin();
  return (
    <div className="admin">
      <aside className="admin-side">
        <div className="brand">
          <span className="brand-mark" style={{ background: "#fff", color: "#1c1917" }}>{shop.name.slice(0, 1)}</span>
          {shop.name}
        </div>
        {shops.length > 1 && (
          <form action={switchShop} style={{ margin: "0 8px 12px" }}>
            <select name="shop" defaultValue={shop.id} className="input" style={{ minHeight: 34, background: "#292524", color: "#fff", border: 0 }}>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button className="btn sm block" style={{ marginTop: 6, background: "#44403c" }}>Перейти</button>
          </form>
        )}
        <AdminNav />
        <div style={{ marginTop: "auto", display: "grid", gap: 4 }}>
          <Link href="/" target="_blank">↗ Відкрити сайт</Link>
          <Link href={`/tg?shop=${shop.slug}`} target="_blank">↗ Відкрити Mini App</Link>
          <div className="small" style={{ color: "#a8a29e", padding: "8px 12px 0" }}>{user.email}</div>
          <form action={signOut}>
            <button className="btn sm ghost block" style={{ color: "#e7e5e4", borderColor: "#44403c" }}>Вийти</button>
          </form>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
