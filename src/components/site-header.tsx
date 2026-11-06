"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LANG_LABEL } from "@/lib/i18n";
import { useShop, useShopCart } from "./shop-context";

export function setLangCookie(lang: string) {
  document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`;
}

export function LangSwitch() {
  const { shop } = useShop();
  const router = useRouter();
  if (shop.languages.length < 2) return null;
  return (
    <div className="lang" role="group" aria-label="Language">
      {shop.languages.map((l) => (
        <button
          key={l}
          aria-pressed={l === shop.lang}
          onClick={() => {
            setLangCookie(l);
            router.refresh();
          }}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}

function SearchBox() {
  const { t } = useShop();
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  return (
    <form
      className="search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/?q=${encodeURIComponent(q.trim())}#catalog` : "/");
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
    </form>
  );
}

export function SiteHeader() {
  const { shop, t } = useShop();
  const cart = useShopCart();
  return (
    <header className="header">
      <div className="container header-in">
        <Link href="/" className="brand">
          {shop.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.logo} alt="" />
          ) : (
            <span className="brand-mark">{shop.name.slice(0, 1)}</span>
          )}
          <span className="hidden-mobile">{shop.name}</span>
        </Link>
        <SearchBox />
        <LangSwitch />
        <Link href="/cart" className="icon-btn cart-btn" aria-label={t("cart")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
            <circle cx="10" cy="20" r="1.4" />
            <circle cx="17" cy="20" r="1.4" />
          </svg>
          {cart.count > 0 && <span className="badge">{cart.count}</span>}
        </Link>
      </div>
    </header>
  );
}
