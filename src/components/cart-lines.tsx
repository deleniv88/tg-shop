"use client";

import Link from "next/link";
import { useShop, useShopCart } from "./shop-context";
import { Stepper } from "./stepper";

export function CartLines({ linkItems = true, compact = false }: { linkItems?: boolean; compact?: boolean }) {
  const { fmt } = useShop();
  const cart = useShopCart();
  return (
    <div className={compact ? "" : "panel"} style={compact ? undefined : { paddingTop: 4, paddingBottom: 4 }}>
      {cart.lines.map((l) => {
        const title = (
          <div style={{ display: "grid", gap: 2 }}>
            <b style={{ fontWeight: 600 }}>{l.name}</b>
            <span className="small muted">
              {l.unit ? `${l.unit} · ` : ""}
              {fmt(l.price)}
            </span>
          </div>
        );
        return (
          <div key={l.id} className="line">
            <div className="line-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {l.image ? <img src={l.image} alt="" /> : <span aria-hidden>{l.emoji}</span>}
            </div>
            {linkItems ? <Link href={`/p/${l.slug}`}>{title}</Link> : title}
            <div className="stack" style={{ justifyItems: "end", gap: 6 }}>
              <Stepper value={l.qty} max={l.stock ?? 999} onChange={(v) => cart.setQty(l, v)} />
              <b className="small">{fmt(l.qty * l.price)}</b>
            </div>
          </div>
        );
      })}
    </div>
  );
}
