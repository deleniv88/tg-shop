"use client";

import { deliveryFor } from "@/lib/money";
import { useShop, useShopCart } from "./shop-context";

export function useTotals() {
  const { shop } = useShop();
  const cart = useShopCart();
  const delivery = deliveryFor(cart.subtotal, shop.deliveryFee, shop.freeFrom);
  const belowMin = cart.subtotal < shop.minOrder;
  return { ...cart, delivery, total: cart.subtotal + delivery, belowMin };
}

export function CartSummary({ children }: { children?: React.ReactNode }) {
  const { shop, t, fmt } = useShop();
  const { subtotal, delivery, total, belowMin } = useTotals();

  const freeLeft = shop.freeFrom !== null ? shop.freeFrom - subtotal : null;
  const target = belowMin ? shop.minOrder : shop.freeFrom;
  const pct = target ? Math.min(100, Math.round((subtotal / target) * 100)) : 100;

  return (
    <div className="panel stack">
      <div className="kv">
        <span className="muted">{t("items")}</span>
        <b>{fmt(subtotal)}</b>
      </div>
      <div className="kv">
        <span className="muted">{t("delivery")}</span>
        <b style={delivery === 0 && !belowMin ? { color: "var(--ok)" } : undefined}>
          {delivery === 0 ? t("free") : fmt(delivery)}
        </b>
      </div>

      {(belowMin || (freeLeft !== null && freeLeft > 0)) && (
        <div>
          <div className="progress" aria-hidden>
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="small muted">
            {belowMin
              ? t("minOrderLeft", { amount: fmt(shop.minOrder - subtotal) })
              : t("freeDeliveryLeft", { amount: fmt(freeLeft!) })}
          </div>
        </div>
      )}
      {!belowMin && freeLeft !== null && freeLeft <= 0 && (
        <div className="small" style={{ color: "var(--ok)", fontWeight: 600 }}>
          ✓ {t("freeDeliveryReached")}
        </div>
      )}

      <div className="kv total">
        <span>{t("total")}</span>
        <span>{fmt(total)}</span>
      </div>
      {shop.deliveryNote && <div className="small muted">{shop.deliveryNote}</div>}
      {children}
    </div>
  );
}
