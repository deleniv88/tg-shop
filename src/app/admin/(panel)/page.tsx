import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { money } from "@/lib/money";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/i18n";
import type { Order, OrderStatus } from "@/lib/types";
import { setOrderStatus } from "../actions";

const STATUSES: OrderStatus[] = ["new", "confirmed", "shipped", "completed", "cancelled"];
const FILTERS: (OrderStatus | "all")[] = ["all", ...STATUSES];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { supabase, shop } = await requireAdmin();

  let q = supabase.from("orders").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }).limit(200);
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  const orders = (data as Order[]) ?? [];

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { data: today } = await supabase
    .from("orders")
    .select("total, status, payment_status")
    .eq("shop_id", shop.id)
    .gte("created_at", since.toISOString());
  const todayList = (today ?? []).filter((o) => o.status !== "cancelled");
  const { count: newCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shop.id)
    .eq("status", "new");

  const m = (n: number) => money(n, shop.currency, "uk");

  return (
    <>
      <h1>Замовлення</h1>
      <div className="stats">
        <div className="stat">
          <span className="muted small">Нові</span>
          <b>{newCount ?? 0}</b>
        </div>
        <div className="stat">
          <span className="muted small">Сьогодні</span>
          <b>{todayList.length}</b>
        </div>
        <div className="stat">
          <span className="muted small">Виручка сьогодні</span>
          <b>{m(todayList.reduce((s, o) => s + o.total, 0))}</b>
        </div>
      </div>

      <div className="tabs">
        {FILTERS.map((f) => (
          <Link key={f} href={f === "all" ? "/admin" : `/admin?status=${f}`} aria-current={(status ?? "all") === f}>
            {f === "all" ? "Усі" : ORDER_STATUS[f].uk}
          </Link>
        ))}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>№</th>
              <th>Дата</th>
              <th>Клієнт</th>
              <th>Джерело</th>
              <th>Статус</th>
              <th>Оплата</th>
              <th style={{ textAlign: "right" }}>Сума</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="clickable">
                <td>
                  <Link href={`/admin/orders/${o.id}`}><b>#{o.number}</b></Link>
                </td>
                <td className="muted">
                  {new Date(o.created_at).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" })}
                </td>
                <td>
                  <Link href={`/admin/orders/${o.id}`}>
                    {o.name}
                    <div className="muted small">{o.phone}</div>
                  </Link>
                </td>
                <td>{o.source === "tg" ? "✈️ Telegram" : "🌐 Сайт"}</td>
                <td>
                  <form action={setOrderStatus} className="row" style={{ gap: 6 }}>
                    <input type="hidden" name="id" value={o.id} />
                    <select name="status" defaultValue={o.status} className={`pill ${o.status}`} style={{ border: 0, cursor: "pointer" }} aria-label="Статус">
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{ORDER_STATUS[s].uk}</option>
                      ))}
                    </select>
                    <button className="btn sm ghost" style={{ height: 26, padding: "0 8px" }} title="Змінити статус">✓</button>
                  </form>
                </td>
                <td><span className={`pill ${o.payment_status}`}>{PAYMENT_STATUS[o.payment_status].uk}</span></td>
                <td style={{ textAlign: "right" }}><b>{money(o.total, o.currency, "uk")}</b></td>
              </tr>
            ))}
            {!orders.length && (
              <tr>
                <td colSpan={7} className="center muted" style={{ padding: 40 }}>
                  Замовлень поки немає. Оформіть тестове на сайті або в Mini App.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
