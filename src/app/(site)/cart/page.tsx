"use client";

import Link from "next/link";
import { CartLines } from "@/components/cart-lines";
import { CartSummary, useTotals } from "@/components/cart-summary";
import { useShop } from "@/components/shop-context";

export default function CartPage() {
  const { shop, t, fmt } = useShop();
  const { lines, belowMin } = useTotals();

  if (!lines.length) {
    return (
      <div className="container empty">
        <div className="emo">🧺</div>
        <h1 className="display" style={{ margin: "12px 0 6px" }}>{t("emptyCart")}</h1>
        <p className="muted">{t("emptyCartHint")}</p>
        <Link href="/" className="btn">{t("toCatalog")}</Link>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title display">{t("cart")}</h1>
      <div className="two-col">
        <CartLines />
        <div className="sticky-summary">
          <CartSummary>
            {belowMin ? (
              <button className="btn block" disabled>
                {t("minOrder")}: {fmt(shop.minOrder)}
              </button>
            ) : (
              <Link href="/checkout" className="btn block" aria-disabled={!shop.isOpen}>
                {t("checkout")} →
              </Link>
            )}
            <Link href="/" className="btn ghost block">{t("continueShopping")}</Link>
          </CartSummary>
        </div>
      </div>
    </div>
  );
}
