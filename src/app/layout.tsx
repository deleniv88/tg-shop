import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLang, getShop, themeStyle } from "@/lib/shop";
import { tr } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShop();
  const lang = await getLang(shop);
  return {
    title: { default: shop.name, template: `%s · ${shop.name}` },
    description: tr(shop.hero_title, lang) || tr(shop.tagline, lang),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const shop = await getShop();
  const lang = await getLang(shop);
  return (
    <html lang={lang}>
      <body style={themeStyle(shop)}>{children}</body>
    </html>
  );
}
