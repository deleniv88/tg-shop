"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CategoryView, ProductView } from "@/lib/view";
import { useShop } from "../shop-context";
import { ProductCard, toLine } from "../product-card";
import { ProductDetail } from "../product-detail";
import { CartLines } from "../cart-lines";
import { CartSummary, useTotals } from "../cart-summary";
import { CheckoutForm, type CheckoutHandle } from "../checkout-form";
import { LangSwitch, setLangCookie } from "../site-header";

type View = { name: "home" } | { name: "product"; id: string } | { name: "cart" } | { name: "checkout" };

type Primary = { text: string; disabled?: boolean; onClick: () => void } | null;

export function TgApp({
  products,
  categories,
  bg,
  primaryColor,
}: {
  products: ProductView[];
  categories: CategoryView[];
  bg: string;
  primaryColor: string;
}) {
  const { shop, t, fmt } = useShop();
  const router = useRouter();
  const totals = useTotals();
  const [wa, setWa] = useState<TgWebApp | null>(null);
  const [view, setView] = useState<View>({ name: "home" });
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pdpQty, setPdpQty] = useState(1);
  const formRef = useRef<CheckoutHandle>(null);
  const [, force] = useState(0);

  const inTelegram = !!wa?.initData;
  const haptic = useCallback(
    (kind: "light" | "success" = "light") => {
      if (!wa) return;
      if (kind === "success") wa.HapticFeedback.notificationOccurred("success");
      else wa.HapticFeedback.impactOccurred("light");
    },
    [wa],
  );

  // ── Telegram bootstrap ──
  const onScriptLoad = useCallback(() => {
    const app = window.Telegram?.WebApp;
    if (!app) return;
    app.ready();
    app.expand();
    try {
      app.setHeaderColor(bg);
      app.setBackgroundColor(bg);
      app.setBottomBarColor?.(bg);
    } catch {}
    setWa(app);
    // first visit: follow the Telegram language if the shop supports it
    const code = app.initDataUnsafe.user?.language_code?.slice(0, 2);
    const hasCookie = document.cookie.includes("lang=");
    const map: Record<string, string> = { uk: "uk", pl: "pl", ru: "uk", en: "en" };
    const want = code ? map[code] : undefined;
    if (!hasCookie && want && want !== shop.lang && shop.languages.includes(want as never)) {
      setLangCookie(want);
      router.refresh();
    }
  }, [bg, router, shop.lang, shop.languages]);

  useEffect(() => {
    if (window.Telegram?.WebApp) onScriptLoad();
  }, [onScriptLoad]);

  const go = useCallback((v: View) => {
    setView(v);
    window.scrollTo({ top: 0 });
  }, []);

  // ── Back button ──
  const back = useCallback(() => {
    if (view.name === "checkout") go({ name: "cart" });
    else go({ name: "home" });
  }, [view.name, go]);

  useEffect(() => {
    if (!wa) return;
    if (view.name === "home") wa.BackButton.hide();
    else wa.BackButton.show();
    wa.BackButton.onClick(back);
    return () => wa.BackButton.offClick(back);
  }, [wa, view.name, back]);

  // ── Primary action (Telegram MainButton or our own bar outside Telegram) ──
  const current = view.name === "product" ? products.find((p) => p.id === view.id) : undefined;

  const primary: Primary = useMemo(() => {
    switch (view.name) {
      case "home":
        return totals.count > 0
          ? { text: `${t("cart")} (${totals.count}) · ${fmt(totals.subtotal)}`, onClick: () => go({ name: "cart" }) }
          : null;
      case "product": {
        if (!current) return null;
        const soldOut = current.stock !== null && current.stock <= 0;
        return {
          text: soldOut ? t("outOfStock") : `${t("addToCart")} · ${fmt(current.price * pdpQty)}`,
          disabled: soldOut,
          onClick: () => {
            totals.add(toLine(current), pdpQty);
            haptic("success");
            setPdpQty(1);
            go({ name: "home" });
          },
        };
      }
      case "cart":
        if (!totals.lines.length) return null;
        return totals.belowMin
          ? { text: `${t("minOrder")}: ${fmt(shop.minOrder)}`, disabled: true, onClick: () => {} }
          : { text: `${t("checkout")} · ${fmt(totals.total)}`, onClick: () => go({ name: "checkout" }), disabled: !shop.isOpen };
      case "checkout":
        if (!totals.lines.length) return null;
        return {
          text: `${t("placeOrder")} · ${fmt(totals.total)}`,
          onClick: () => void formRef.current?.submit(),
        };
    }
  }, [view.name, totals, current, pdpQty, t, fmt, go, haptic, shop.minOrder, shop.isOpen]);

  const primaryRef = useRef(primary);
  primaryRef.current = primary;

  useEffect(() => {
    if (!wa || !inTelegram) return;
    const handler = () => {
      const p = primaryRef.current;
      if (p && !p.disabled) p.onClick();
    };
    wa.MainButton.onClick(handler);
    return () => wa.MainButton.offClick(handler);
  }, [wa, inTelegram]);

  useEffect(() => {
    if (!wa || !inTelegram) return;
    if (!primary) {
      wa.MainButton.hide();
      return;
    }
    wa.MainButton.setParams({
      text: primary.text,
      color: primary.disabled ? "#9ca3af" : primaryColor,
      text_color: "#ffffff",
      is_active: !primary.disabled,
      is_visible: true,
    });
  }, [wa, inTelegram, primary, primaryColor]);

  // ── Catalog filtering ──
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => (!cat || p.categoryId === cat) && (!s || p.name.toLowerCase().includes(s)));
  }, [products, cat, q]);

  const openSupport = () => {
    if (!shop.support) return;
    const url = `https://t.me/${shop.support}`;
    if (wa) wa.openTelegramLink(url);
    else window.open(url, "_blank");
  };

  return (
    <div className="tg">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onLoad={onScriptLoad} />

      <div className="container">
        {view.name === "home" && (
          <div className="sheet-enter">
            <div className="tg-top">
              <div className="row between" style={{ marginBottom: 10 }}>
                <div className="brand" style={{ fontSize: 17 }}>
                  {shop.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shop.logo} alt="" />
                  ) : (
                    <span className="brand-mark">{shop.name.slice(0, 1)}</span>
                  )}
                  {shop.name}
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <LangSwitch />
                  {shop.support && (
                    <button className="icon-btn" aria-label={t("support")} onClick={openSupport}>
                      💬
                    </button>
                  )}
                </div>
              </div>
              <div className="search" style={{ maxWidth: "none" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
              </div>
            </div>

            {!q && !cat && (
              <div className="tg-hero">
                <div className="small" style={{ opacity: 0.75, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>
                  {shop.tagline}
                </div>
                <h1 className="display" style={{ margin: "6px 0 4px", position: "relative" }}>{shop.heroTitle || shop.name}</h1>
                {shop.deliveryNote && <div className="small" style={{ opacity: 0.85, position: "relative" }}>{shop.deliveryNote}</div>}
              </div>
            )}
            {!shop.isOpen && <div className="alert" style={{ marginBottom: 12 }}>{t("shopClosed")}</div>}

            <div className="chips" style={{ margin: "4px 0 14px" }}>
              <button className="chip" aria-current={!cat} onClick={() => { setCat(null); haptic(); }}>
                {t("all")}
              </button>
              {categories.map((c) => (
                <button key={c.id} className="chip" aria-current={cat === c.id} onClick={() => { setCat(c.id); haptic(); }}>
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>

            <div className="grid">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  p={p}
                  onOpen={() => {
                    setPdpQty(1);
                    go({ name: "product", id: p.id });
                  }}
                  onAdd={() => haptic()}
                />
              ))}
            </div>
            {!filtered.length && (
              <div className="empty">
                <div className="emo">🔍</div>
              </div>
            )}
          </div>
        )}

        {view.name === "product" && current && (
          <div className="sheet-enter" style={{ paddingTop: 8 }}>
            {!inTelegram && (
              <button className="btn ghost sm" onClick={back} style={{ marginTop: 8 }}>
                ← {t("back")}
              </button>
            )}
            <ProductDetail p={current} hideButton qty={pdpQty} setQty={setPdpQty} />
          </div>
        )}

        {view.name === "cart" && (
          <div className="sheet-enter stack" style={{ paddingTop: 14 }}>
            {!inTelegram && (
              <button className="btn ghost sm" onClick={back} style={{ justifySelf: "start" }}>
                ← {t("back")}
              </button>
            )}
            <h1 className="display" style={{ fontSize: 26 }}>{t("cart")}</h1>
            {totals.lines.length ? (
              <>
                <CartLines linkItems={false} />
                <CartSummary />
              </>
            ) : (
              <div className="empty">
                <div className="emo">🧺</div>
                <p className="muted">{t("emptyCart")}</p>
                <button className="btn" onClick={() => go({ name: "home" })}>{t("toCatalog")}</button>
              </div>
            )}
          </div>
        )}

        {view.name === "checkout" && (
          <div className="sheet-enter stack" style={{ paddingTop: 14, gap: 16 }}>
            {!inTelegram && (
              <button className="btn ghost sm" onClick={back} style={{ justifySelf: "start" }}>
                ← {t("backToCart")}
              </button>
            )}
            <h1 className="display" style={{ fontSize: 26 }}>{t("checkout")}</h1>
            <CheckoutForm
              ref={formRef}
              source="tg"
              initData={wa?.initData}
              defaults={{
                name: [wa?.initDataUnsafe.user?.first_name, wa?.initDataUnsafe.user?.last_name].filter(Boolean).join(" "),
              }}
              showSubmit={!inTelegram}
              onChange={() => force((n) => n + 1)}
              onDone={(r) => {
                haptic("success");
                wa?.MainButton.hide();
                const qs = `?t=${r.token}&tg=1`;
                router.push(r.paymentMethod === "test_card" ? `/pay/${r.id}${qs}` : `/order/${r.id}${qs}`);
              }}
            />
            <CartSummary />
          </div>
        )}
      </div>

      {!inTelegram && primary && view.name !== "checkout" && (
        <div className="tg-bar">
          <button className="btn block" style={{ height: 50 }} disabled={primary.disabled} onClick={primary.onClick}>
            {primary.text}
          </button>
        </div>
      )}
    </div>
  );
}
