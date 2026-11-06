import Link from "next/link";
import { notFound } from "next/navigation";
import { getLang } from "@/lib/shop";
import { getOrderByToken } from "@/lib/order-access";
import { money } from "@/lib/money";
import { paymentLabel, statusLabel, t } from "@/lib/i18n";

export const metadata = { robots: { index: false } };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; tg?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const data = await getOrderByToken(id, sp.t);
  if (!data) notFound();
  const { shop } = data;
  const lang = data.order.lang && shop.languages.includes(data.order.lang) ? data.order.lang : await getLang(shop);
  const { order, items } = data;
  const m = (n: number) => money(n, order.currency, lang);
  const ok = order.payment_status === "paid" || order.payment_method === "cod";

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="center stack" style={{ gap: 8, justifyItems: "center" }}>
        <div style={{ fontSize: 56 }} aria-hidden>{ok ? "🎉" : "⏳"}</div>
        <h1 className="display" style={{ fontSize: 28 }}>{t(lang, "thanks")}</h1>
        <div className="muted">{t(lang, "orderNo", { n: order.number })}</div>
        <p className="muted" style={{ margin: 0 }}>{t(lang, "thanksText")}</p>
      </div>

      <div className="panel stack" style={{ gap: 6 }}>
        <div className="kv">
          <span className="muted">{t(lang, "orderStatus")}</span>
          <b>{statusLabel(order.status, lang)}</b>
        </div>
        <div className="kv">
          <span className="muted">{t(lang, "paymentStatus")}</span>
          <b>{paymentLabel(order.payment_status, lang)}</b>
        </div>
      </div>

      <div className="panel">
        {items.map((i) => (
          <div key={i.id} className="kv">
            <span>
              {i.name} × {i.qty}
            </span>
            <b>{m(i.total)}</b>
          </div>
        ))}
        <div className="kv">
          <span className="muted">{t(lang, "delivery")}</span>
          <span>{order.delivery_fee ? m(order.delivery_fee) : t(lang, "free")}</span>
        </div>
        <div className="kv total">
          <span>{t(lang, "total")}</span>
          <span>{m(order.total)}</span>
        </div>
      </div>

      {order.payment_status === "failed" && (
        <Link href={`/pay/${order.id}?t=${order.access_token}${sp.tg ? "&tg=1" : ""}`} className="btn block">
          {t(lang, "tryAgain")}
        </Link>
      )}
      <Link href={sp.tg ? "/tg" : "/"} className="btn ghost block">
        {t(lang, "continueShopping")}
      </Link>
    </div>
  );
}
