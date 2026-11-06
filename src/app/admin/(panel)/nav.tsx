"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Замовлення", exact: true },
  { href: "/admin/products", label: "Товари" },
  { href: "/admin/categories", label: "Категорії" },
  { href: "/admin/settings", label: "Налаштування" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav style={{ display: "contents" }}>
      {items.map((i) => {
        const active = i.exact ? path === i.href || path.startsWith("/admin/orders") : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
