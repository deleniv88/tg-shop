"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { useShop, useShopCart } from "./shop-context";
import type { PaymentMethod } from "@/lib/types";

export type CheckoutResult = { id: string; number: number; token: string; paymentMethod: PaymentMethod };

export type CheckoutHandle = { submit: () => Promise<CheckoutResult | null>; valid: () => boolean };

type Props = {
  source: "web" | "tg";
  initData?: string;
  defaults?: { name?: string };
  onDone: (r: CheckoutResult) => void;
  /** Render the submit button inside the form (site). The Mini App uses Telegram's MainButton instead. */
  showSubmit?: boolean;
  onChange?: () => void;
};

const ERR: Record<string, "required" | "error" | "shopClosed"> = { required: "required", closed: "shopClosed" };

export const CheckoutForm = forwardRef<CheckoutHandle, Props>(function CheckoutForm(
  { source, initData, defaults, onDone, showSubmit = true, onChange },
  ref,
) {
  const { shop, t } = useShop();
  const cart = useShopCart();
  const [form, setForm] = useState({
    name: defaults?.name ?? "",
    phone: "",
    email: "",
    address: "",
    city: "",
    zip: "",
    comment: "",
    paymentMethod: shop.paymentMethods[0] as PaymentMethod,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    onChange?.();
  };

  const valid = () => !!(form.name.trim() && form.phone.trim() && form.address.trim() && form.city.trim());

  async function submit(): Promise<CheckoutResult | null> {
    if (busy) return null;
    if (!valid()) {
      setError(t("required"));
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          shop: shop.slug,
          source,
          initData,
          lang: shop.lang,
          items: cart.lines.map((l) => ({ id: l.id, qty: l.qty })),
          ...form,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message && json.code !== "required" ? json.message : t(ERR[json.code] ?? "error"));
        return null;
      }
      const result: CheckoutResult = { id: json.id, number: json.number, token: json.token, paymentMethod: json.paymentMethod };
      cart.clear();
      onDone(result);
      return result;
    } catch {
      setError(t("error"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  useImperativeHandle(ref, () => ({ submit, valid }));

  return (
    <form
      className="stack"
      style={{ gap: 18 }}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="name">{t("name")} *</label>
          <input id="name" autoComplete="name" value={form.name} onChange={set("name")} required />
        </div>
        <div className="field">
          <label htmlFor="phone">{t("phone")} *</label>
          <input id="phone" type="tel" autoComplete="tel" placeholder="+48 123 456 789" value={form.phone} onChange={set("phone")} required />
        </div>
        <div className="field">
          <label htmlFor="email">
            {t("email")} <small>({t("optional")})</small>
          </label>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} />
        </div>
        <div className="field full">
          <label htmlFor="address">{t("address")} *</label>
          <input id="address" autoComplete="street-address" placeholder={t("addressPh")} value={form.address} onChange={set("address")} required />
        </div>
        <div className="field">
          <label htmlFor="city">{t("city")} *</label>
          <input id="city" autoComplete="address-level2" value={form.city} onChange={set("city")} required />
        </div>
        <div className="field">
          <label htmlFor="zip">{t("zip")}</label>
          <input id="zip" autoComplete="postal-code" value={form.zip} onChange={set("zip")} />
        </div>
        <div className="field full">
          <label htmlFor="comment">
            {t("comment")} <small>({t("optional")})</small>
          </label>
          <textarea id="comment" placeholder={t("commentPh")} value={form.comment} onChange={set("comment")} />
        </div>
      </div>

      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
        <legend className="small" style={{ fontWeight: 600, marginBottom: 8 }}>
          {t("payment")}
        </legend>
        {shop.paymentMethods.map((m) => (
          <label key={m} className="radio-card">
            <input
              type="radio"
              name="pm"
              value={m}
              checked={form.paymentMethod === m}
              onChange={() => setForm((f) => ({ ...f, paymentMethod: m }))}
            />
            <span>{m === "test_card" ? "💳 " : "💵 "}{t(m === "test_card" ? "pay_test_card" : "pay_cod")}</span>
          </label>
        ))}
      </fieldset>

      {error && <div className="alert" role="alert">{error}</div>}

      {showSubmit && (
        <button className="btn block" type="submit" disabled={busy || cart.lines.length === 0}>
          {busy ? "…" : form.paymentMethod === "test_card" ? t("placeOrderPay") : t("placeOrder")}
        </button>
      )}
    </form>
  );
});
