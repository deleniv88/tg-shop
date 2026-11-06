"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { CartSummary, useTotals } from "@/components/cart-summary";
import { CartLines } from "@/components/cart-lines";
import { useShop } from "@/components/shop-context";

export default function CheckoutPage() {
  const { t } = useShop();
  const router = useRouter();
  const { lines, belowMin } = useTotals();

  useEffect(() => {
    if (!lines.length) return;
    if (belowMin) router.replace("/cart");
  }, [lines.length, belowMin, router]);

  if (!lines.length) {
    return (
      <div className="container empty">
        <div className="emo">🧺</div>
        <p className="muted">{t("emptyCart")}</p>
        <Link href="/" className="btn">{t("toCatalog")}</Link>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title display">{t("checkout")}</h1>
      <div className="two-col">
        <div className="panel">
          <CheckoutForm
            source="web"
            onDone={(r) =>
              router.push(r.paymentMethod === "test_card" ? `/pay/${r.id}?t=${r.token}` : `/order/${r.id}?t=${r.token}`)
            }
          />
        </div>
        <div className="sticky-summary stack">
          <b>{t("summary")}</b>
          <CartLines linkItems={false} />
          <CartSummary>
            <Link href="/cart" className="btn ghost block">← {t("backToCart")}</Link>
          </CartSummary>
        </div>
      </div>
    </div>
  );
}
