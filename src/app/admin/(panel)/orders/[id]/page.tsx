import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { money } from "@/lib/money";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/i18n";
import type { Order, OrderItem, OrderStatus, PaymentStatus } from "@/lib/types";
import { setOrderStatus, setPaymentStatus } from "../../../actions";

const STATUSES: OrderStatus[] = ["new", "confirmed", "shipped", "completed", "cancelled"];
const PAYMENTS: PaymentStatus[] = ["pending", "paid", "failed", "not_required"];

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, shop } = await requireAdmin();
  const { data: o } = await supabase.from("orders").select("*").eq("id", id).eq("shop_id", shop.id).maybeSingle();
  if (!o) notFound();
  const order = o as Order;
  const { data: it } = await supabase.from("order_items").select("*").eq("order_id", id);
  const items = (it as OrderItem[]) ?? [];
  const m = (n: number) => money(n, order.currency, "uk");

  return (
    <>
      <div className="row between" style={{ marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <Link href="/admin" className="muted small">← Замовлення</Link>
          <h1 style={{ margin: "4px 0 0" }}>Замовлення #{order.number}</h1>
          <div className="muted small">
            {new Date(order.created_at).toLocaleString("uk-UA", { timeZone: "Europe/Warsaw" })} ·{" "}
            {order.source === "tg" ? "Telegram" : "Сайт"} · мова: {order.lang}
          </div>
        </div>
        <div className="row">
          <span className={`pill ${order.status}`}>{ORDER_STATUS[order.status].uk}</span>
          <span className={`pill ${order.payment_status}`}>{PAYMENT_STATUS[order.payment_status].uk}</span>
        </div>
      </div>

      <div className="admin-grid">
        <div className="stack" style={{ gap: 16 }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Ціна</th>
                  <th>К-сть</th>
                  <th style={{ textAlign: "right" }}>Сума</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.product_id ? <Link href={`/admin/products/${i.product_id}`}>{i.name}</Link> : i.name}</td>
                    <td>{m(i.price)}</td>
                    <td>{i.qty}</td>
                    <td style={{ textAlign: "right" }}>{m(i.total)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} className="muted">Доставка</td>
                  <td style={{ textAlign: "right" }}>{m(order.delivery_fee)}</td>
                </tr>
                <tr>
                  <td colSpan={3}><b>Разом</b></td>
                  <td style={{ textAlign: "right" }}><b>{m(order.total)}</b></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel stack" style={{ gap: 6 }}>
            <b>Клієнт</b>
            <div>{order.name}</div>
            <div><a href={`tel:${order.phone}`}>{order.phone}</a>{order.email && <> · <a href={`mailto:${order.email}`}>{order.email}</a></>}</div>
            <div>{order.address}, {order.zip} {order.city}</div>
            {order.telegram_id && <div className="muted small">Telegram ID: {order.telegram_id}</div>}
            {order.comment && <div className="note">💬 {order.comment}</div>}
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <form action={setOrderStatus} className="panel stack">
            <b>Статус замовлення</b>
            <input type="hidden" name="id" value={order.id} />
            <div className="stack" style={{ gap: 6 }}>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  name="status"
                  value={s}
                  className={`btn sm block ${s === order.status ? "" : "ghost"}`}
                  style={s === order.status ? { background: "#1c1917" } : undefined}
                  disabled={s === order.status}
                >
                  {ORDER_STATUS[s].uk}
                </button>
              ))}
            </div>
            {order.telegram_id && <div className="muted small">Покупець отримає повідомлення в Telegram.</div>}
          </form>

          <form action={setPaymentStatus} className="panel stack">
            <b>Оплата</b>
            <div className="muted small">
              Спосіб: {order.payment_method === "cod" ? "при отриманні" : "картка (тест)"}
            </div>
            <input type="hidden" name="id" value={order.id} />
            <div className="field">
              <select name="payment_status" defaultValue={order.payment_status}>
                {PAYMENTS.map((p) => (
                  <option key={p} value={p}>{PAYMENT_STATUS[p].uk}</option>
                ))}
              </select>
            </div>
            <button className="btn sm ghost">Зберегти</button>
          </form>
        </div>
      </div>
    </>
  );
}
