import { Suspense } from "react";
import { getLang, getShop } from "@/lib/shop";
import { toShopView } from "@/lib/view";
import { ShopProvider } from "@/components/shop-context";
import { SiteHeader } from "@/components/site-header";
import { t } from "@/lib/i18n";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const shop = await getShop();
  const lang = await getLang(shop);
  const view = toShopView(shop, lang);
  return (
    <ShopProvider shop={view}>
      <Suspense>
        <SiteHeader />
      </Suspense>
      {!shop.is_open && (
        <div className="container" style={{ marginTop: 16 }}>
          <div className="alert">{t(lang, "shopClosed")}</div>
        </div>
      )}
      <main>{children}</main>
      <footer className="footer">
        <div className="container footer-in">
          <div>
            <b style={{ color: "var(--text)" }}>{shop.name}</b>
            <div>{view.tagline}</div>
          </div>
          <div className="stack" style={{ gap: 4 }}>
            {shop.contact_phone && <a href={`tel:${shop.contact_phone.replace(/\s/g, "")}`}>{shop.contact_phone}</a>}
            {shop.contact_email && <a href={`mailto:${shop.contact_email}`}>{shop.contact_email}</a>}
            {shop.support_username && (
              <a href={`https://t.me/${shop.support_username}`} target="_blank" rel="noreferrer">
                Telegram · @{shop.support_username}
              </a>
            )}
          </div>
          <div>© {new Date().getFullYear()} {shop.name}. {t(lang, "allRights")}.</div>
        </div>
      </footer>
    </ShopProvider>
  );
}
