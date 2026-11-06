import { getLang, getShop } from "@/lib/shop";
import { toShopView } from "@/lib/view";
import { ShopProvider } from "@/components/shop-context";

// Minimal layout for payment and order-status pages: they open both on the site and inside Telegram.
export default async function PlainLayout({ children }: { children: React.ReactNode }) {
  const shop = await getShop();
  const lang = await getLang(shop);
  return (
    <ShopProvider shop={toShopView(shop, lang)}>
      <main className="container" style={{ maxWidth: 560, padding: "32px 18px 60px" }}>
        {children}
      </main>
    </ShopProvider>
  );
}
