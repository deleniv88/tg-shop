"use client";

import Link from "next/link";
import type { CategoryView, ProductView } from "@/lib/view";
import { ProductCard } from "./product-card";
import { useShop } from "./shop-context";

export function CategoryChips({ cats, current }: { cats: CategoryView[]; current?: string }) {
  const { t } = useShop();
  return (
    <nav className="chips" aria-label={t("categories")}>
      <Link href="/#catalog" className="chip" aria-current={!current}>
        {t("all")}
      </Link>
      {cats.map((c) => (
        <Link key={c.id} href={`/c/${c.slug}`} className="chip" aria-current={current === c.slug}>
          {c.emoji} {c.name}
        </Link>
      ))}
    </nav>
  );
}

export function ProductGrid({ products }: { products: ProductView[] }) {
  return (
    <div className="grid">
      {products.map((p) => (
        <ProductCard key={p.id} p={p} href={`/p/${p.slug}`} />
      ))}
    </div>
  );
}
