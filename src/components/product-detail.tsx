"use client";

import { useState } from "react";
import type { ProductView } from "@/lib/view";
import { useShop, useShopCart } from "./shop-context";
import { ProductMedia, toLine } from "./product-card";
import { Stepper } from "./stepper";

/** Product page body. Used by the site page and by the Mini App product view. */
export function ProductDetail({
  p,
  onAdded,
  hideButton,
  qty,
  setQty,
}: {
  p: ProductView;
  onAdded?: () => void;
  hideButton?: boolean;
  qty?: number;
  setQty?: (n: number) => void;
}) {
  const { t, fmt } = useShop();
  const cart = useShopCart();
  const [localQty, setLocalQty] = useState(1);
  const q = qty ?? localQty;
  const setQ = setQty ?? setLocalQty;
  const [img, setImg] = useState(0);
  const soldOut = p.stock !== null && p.stock <= 0;
  const inCart = cart.qtyOf(p.id);

  return (
    <div className="pdp">
      <div>
        <div className="pdp-media">
          {p.images.length ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.images[img]} alt={p.name} />
          ) : (
            <ProductMedia p={p} size="lg" />
          )}
        </div>
        {p.images.length > 1 && (
          <div className="thumbs">
            {p.images.map((src, i) => (
              <button key={src} aria-pressed={i === img} onClick={() => setImg(i)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="stack" style={{ gap: 16, alignContent: "start" }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="display">{p.name}</h1>
          {p.unit && <div className="muted">{p.unit}</div>}
        </div>
        <div className="price">
          {fmt(p.price)}
          {p.compareAt && <s>{fmt(p.compareAt)}</s>}
        </div>

        {p.adult && <div className="note warn">🔞 {t("adultsOnly")}</div>}

        {!hideButton && (
          <div className="row" style={{ flexWrap: "wrap" }}>
            <Stepper size="lg" value={q} min={1} max={Math.max(1, (p.stock ?? 999) - inCart)} onChange={setQ} />
            <button
              className="btn grow"
              style={{ height: 48 }}
              disabled={soldOut}
              onClick={() => {
                cart.add(toLine(p), q);
                setQ(1);
                onAdded?.();
              }}
            >
              {soldOut ? t("outOfStock") : `${t("addToCart")} · ${fmt(p.price * q)}`}
            </button>
          </div>
        )}
        {hideButton && !soldOut && (
          <div className="row">
            <span className="muted small">{t("qty")}</span>
            <Stepper size="lg" value={q} min={1} max={Math.max(1, (p.stock ?? 999) - inCart)} onChange={setQ} />
          </div>
        )}
        {inCart > 0 && (
          <div className="small" style={{ color: "var(--ok)", fontWeight: 600 }}>
            ✓ {t("inCart")}: {inCart}
          </div>
        )}

        {p.description && <p style={{ margin: 0 }}>{p.description}</p>}
        {p.allergens && (
          <div className="note">
            <b>⚠️ {t("allergens")}:</b> {p.allergens}
          </div>
        )}
        {p.ingredients && (
          <div>
            <b>{t("ingredients")}</b>
            <p className="muted" style={{ margin: "4px 0 0" }}>{p.ingredients}</p>
          </div>
        )}
      </div>
    </div>
  );
}
