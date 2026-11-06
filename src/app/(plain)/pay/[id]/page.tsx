import { notFound, redirect } from "next/navigation";
import { getLang } from "@/lib/shop";
import { getOrderByToken } from "@/lib/order-access";
import { money } from "@/lib/money";
import { t } from "@/lib/i18n";
import { TestPayButtons } from "./pay-buttons";

export const metadata = { robots: { index: false } };

export default async function PayPage({
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
  const { order } = data;
  const q = `?t=${order.access_token}${sp.tg ? "&tg=1" : ""}`;
  if (order.payment_status === "paid" || order.payment_method !== "test_card") redirect(`/order/${order.id}${q}`);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <div className="muted small">{shop.name}</div>
        <h1 className="display" style={{ fontSize: 28 }}>{t(lang, "testPayment")}</h1>
        <div className="muted">{t(lang, "orderNo", { n: order.number })}</div>
      </div>

      <div className="paycard" aria-hidden>
        <div className="row between">
          <b>TEST BANK</b>
          <span>VISA</span>
        </div>
        <div className="num">4242 4242 4242 4242</div>
        <div className="row between small">
          <span>DEMO CUSTOMER</span>
          <span>12/34</span>
        </div>
      </div>

      <div className="note">{t(lang, "testPaymentHint")}</div>
      {order.payment_status === "failed" && <div className="alert">{t(lang, "payFailed")}</div>}

      <div className="panel">
        <div className="kv total" style={{ border: 0, margin: 0, padding: 0 }}>
          <span>{t(lang, "total")}</span>
          <span>{money(order.total, order.currency, lang)}</span>
        </div>
      </div>

      <TestPayButtons
        id={order.id}
        token={order.access_token}
        next={`/order/${order.id}${q}`}
        payLabel={t(lang, "payNow", { amount: money(order.total, order.currency, lang) })}
        declineLabel={t(lang, "declinePay")}
      />
    </div>
  );
}
