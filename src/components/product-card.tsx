"use client";

import Link from "next/link";
import type { ProductView } from "@/lib/view";
import { useShop, useShopCart } from "./shop-context";
import { Stepper } from "./stepper";

export function toLine(p: ProductView) {
  return { id: p.id, name: p.name, price: p.price, image: p.image, emoji: p.emoji, unit: p.unit, slug: p.slug, stock: p.stock };
}

export function ProductMedia({ p, size = "card" }: { p: ProductView; size?: "card" | "lg" }) {
  if (p.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.image} alt={p.name} loading="lazy" />;
  }
  return (
    <span className="emo" aria-hidden style={size === "lg" ? { fontSize: 120 } : undefined}>
      {p.emoji}
    </span>
  );
}

type Props = { p: ProductView; href?: string; onOpen?: () => void; onAdd?: () => void };

export function ProductCard({ p, href, onOpen, onAdd }: Props) {
  const { t, fmt } = useShop();
  const cart = useShopCart();
  const qty = cart.qtyOf(p.id);
  const soldOut = p.stock !== null && p.stock <= 0;

  const media = (
    <div className="card-media">
      <ProductMedia p={p} />
      {soldOut ? (
        <span className="card-tag gray">{t("outOfStock")}</span>
      ) : p.compareAt ? (
        <span className="card-tag">{t("sale")}</span>
      ) : null}
    </div>
  );
  const title = (
    <>
      <span className="card-title">{p.name}</span>
      {p.unit && <span className="card-unit">{p.unit}</span>}
    </>
  );

  return (
    <article className="card">
      {href ? (
        <Link href={href}>{media}</Link>
      ) : (
        <button onClick={onOpen} style={{ border: 0, padding: 0, background: "none", cursor: "pointer" }} aria-label={p.name}>
          {media}
        </button>
      )}
      <div className="card-body">
        {href ? (
          <Link href={href} style={{ display: "grid", gap: 2 }}>
            {title}
          </Link>
        ) : (
          <button onClick={onOpen} style={{ all: "unset", cursor: "pointer", display: "grid", gap: 2 }}>
            {title}
          </button>
        )}
        <div className="card-foot">
          <span className="price">
            {fmt(p.price)}
            {p.compareAt && <s>{fmt(p.compareAt)}</s>}
          </span>
          {qty > 0 ? (
            <Stepper value={qty} max={p.stock ?? 999} onChange={(v) => cart.setQty(toLine(p), v)} />
          ) : (
            <button
              className="add-btn"
              disabled={soldOut}
              aria-label={t("addToCart")}
              onClick={() => {
                cart.add(toLine(p));
                onAdd?.();
              }}
            >
              +
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
