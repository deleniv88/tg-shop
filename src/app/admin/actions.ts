"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { userDb } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/admin";
import { l10nFrom, requireAdmin, slugify } from "@/lib/admin";
import { parseMoney } from "@/lib/money";
import { notifyCustomer } from "@/lib/notify";
import { connectBot } from "@/lib/bot";
import { tg } from "@/lib/telegram";
import type { OrderStatus } from "@/lib/types";

// ───────── auth ─────────
export async function signIn(form: FormData) {
  const supabase = await userDb();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) redirect("/admin/login?e=auth");
  redirect("/admin");
}

export async function signOut() {
  const supabase = await userDb();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function switchShop(form: FormData) {
  (await cookies()).set("admin_shop", String(form.get("shop")), { path: "/admin", httpOnly: true, sameSite: "lax" });
  redirect("/admin");
}

// ───────── orders ─────────
export async function setOrderStatus(form: FormData) {
  const { supabase, shop } = await requireAdmin();
  const id = String(form.get("id"));
  const status = String(form.get("status")) as OrderStatus;
  const { error } = await supabase.from("orders").update({ status }).eq("id", id).eq("shop_id", shop.id);
  if (!error) await notifyCustomer(shop, id);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
}

export async function setPaymentStatus(form: FormData) {
  const { supabase, shop } = await requireAdmin();
  const id = String(form.get("id"));
  await supabase.from("orders").update({ payment_status: String(form.get("payment_status")) }).eq("id", id).eq("shop_id", shop.id);
  revalidatePath(`/admin/orders/${id}`);
}

// ───────── products ─────────
async function uploadImages(shopId: string, files: File[]) {
  const urls: string[] = [];
  for (const file of files) {
    if (!file || !file.size) continue;
    if (file.size > 4 * 1024 * 1024) continue; // 4 MB limit (Vercel request cap)
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${shopId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await db().storage.from("product-images").upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (error) {
      console.error("upload", error);
      continue;
    }
    urls.push(db().storage.from("product-images").getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

export async function saveProduct(form: FormData) {
  const { supabase, shop } = await requireAdmin();
  const langs = shop.languages;
  const id = String(form.get("id") ?? "");
  const name = l10nFrom(form, "name", langs);
  const price = parseMoney(String(form.get("price") ?? ""));
  if (!Object.keys(name).length || price === null) redirect(`/admin/products/${id || "new"}?e=required`);

  const keep = form.getAll("keep_image").map(String);
  const extraUrls = String(form.get("image_urls") ?? "")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//.test(s));
  const uploaded = await uploadImages(shop.id, form.getAll("images") as File[]);

  const stockRaw = String(form.get("stock") ?? "").trim();
  const record = {
    shop_id: shop.id,
    name,
    slug: slugify(String(form.get("slug") || "") || name[shop.default_lang] || Object.values(name)[0]),
    sku: String(form.get("sku") ?? "").trim() || null,
    category_id: String(form.get("category_id") ?? "") || null,
    description: l10nFrom(form, "description", langs),
    ingredients: l10nFrom(form, "ingredients", langs),
    allergens: l10nFrom(form, "allergens", langs),
    unit: String(form.get("unit") ?? "").trim() || null,
    price,
    compare_at_price: parseMoney(String(form.get("compare_at_price") ?? "")),
    stock: stockRaw === "" ? null : Math.max(0, Math.floor(Number(stockRaw))),
    is_active: form.get("is_active") === "on",
    is_featured: form.get("is_featured") === "on",
    is_18plus: form.get("is_18plus") === "on",
    sort: Number(form.get("sort") ?? 0) || 0,
    images: [...keep, ...uploaded, ...extraUrls],
  };

  const res = id
    ? await supabase.from("products").update(record).eq("id", id).eq("shop_id", shop.id).select("id").single()
    : await supabase.from("products").insert(record).select("id").single();
  if (res.error) {
    const code = res.error.code === "23505" ? "slug" : "save";
    redirect(`/admin/products/${id || "new"}?e=${code}`);
  }
  revalidatePath("/admin/products");
  redirect(`/admin/products/${res.data.id}?saved=1`);
}

export async function toggleProduct(form: FormData) {
  const { supabase, shop } = await requireAdmin();
  await supabase
    .from("products")
    .update({ is_active: form.get("active") === "1" })
    .eq("id", String(form.get("id")))
    .eq("shop_id", shop.id);
  revalidatePath("/admin/products");
}

export async function quickUpdateProduct(form: FormData) {
  const { supabase, shop } = await requireAdmin();
  const price = parseMoney(String(form.get("price") ?? ""));
  const stockRaw = String(form.get("stock") ?? "").trim();
  const patch: Record<string, unknown> = { stock: stockRaw === "" ? null : Math.max(0, Math.floor(Number(stockRaw))) };
  if (price !== null) patch.price = price;
  await supabase.from("products").update(patch).eq("id", String(form.get("id"))).eq("shop_id", shop.id);
  revalidatePath("/admin/products");
}

export async function deleteProduct(form: FormData) {
  const { supabase, shop } = await requireAdmin();
  await supabase.from("products").delete().eq("id", String(form.get("id"))).eq("shop_id", shop.id);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

/**
 * CSV columns (header row required, comma or semicolon):
 * slug, sku, category, name_uk, name_pl, description_uk, description_pl, ingredients_uk, ingredients_pl,
 * allergens_uk, allergens_pl, unit, price, compare_at_price, stock, is_active, is_featured, image_url
 * Rows are matched by slug (or generated from the name) and upserted. Unknown categories are created.
 */
export async function importCsv(form: FormData) {
  const { supabase, shop } = await requireAdmin();
  const file = form.get("file") as File | null;
  if (!file || !file.size) redirect("/admin/products/import?e=file");
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const { data: cats } = await supabase.from("categories").select("id, slug, name").eq("shop_id", shop.id);
  const catBySlug = new Map((cats ?? []).map((c) => [c.slug as string, c.id as string]));

  let ok = 0;
  let failed = 0;
  for (const row of parsed.data) {
    const name: Record<string, string> = {};
    for (const l of shop.languages) if (row[`name_${l}`]?.trim()) name[l] = row[`name_${l}`].trim();
    if (!name[shop.default_lang] && row.name?.trim()) name[shop.default_lang] = row.name.trim();
    const price = parseMoney(row.price);
    if (!Object.keys(name).length || price === null) {
      failed++;
      continue;
    }

    let categoryId: string | null = null;
    const catName = row.category?.trim();
    if (catName) {
      const cslug = slugify(catName);
      categoryId = catBySlug.get(cslug) ?? null;
      if (!categoryId) {
        const { data: c } = await supabase
          .from("categories")
          .insert({ shop_id: shop.id, slug: cslug, name: { [shop.default_lang]: catName } })
          .select("id")
          .single();
        if (c) {
          categoryId = c.id;
          catBySlug.set(cslug, c.id);
        }
      }
    }

    const pick = (prefix: string) => {
      const o: Record<string, string> = {};
      for (const l of shop.languages) if (row[`${prefix}_${l}`]?.trim()) o[l] = row[`${prefix}_${l}`].trim();
      return o;
    };
    const bool = (v: string | undefined, d: boolean) => (v === undefined || v === "" ? d : /^(1|true|yes|так|tak)$/i.test(v.trim()));

    const { error } = await supabase.from("products").upsert(
      {
        shop_id: shop.id,
        slug: slugify(row.slug?.trim() || Object.values(name)[0]),
        sku: row.sku?.trim() || null,
        category_id: categoryId,
        name,
        description: pick("description"),
        ingredients: pick("ingredients"),
        allergens: pick("allergens"),
        unit: row.unit?.trim() || null,
        price,
        compare_at_price: parseMoney(row.compare_at_price),
        stock: row.stock?.trim() ? Math.max(0, Math.floor(Number(row.stock))) : null,
        is_active: bool(row.is_active, true),
        is_featured: bool(row.is_featured, false),
        images: (row.image_url ?? "").split(/[\s|]+/).filter((u) => /^https?:\/\//.test(u)),
      },
      { onConflict: "shop_id,slug" },
    );
    if (error) failed++;
    else ok++;
  }
  revalidatePath("/admin/products");
  redirect(`/admin/products/import?ok=${ok}&failed=${failed}`);
}

// ───────── categories ─────────
export async function saveCategory(form: FormData) {
  const { supabase, shop } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const name = l10nFrom(form, "name", shop.languages);
  if (!Object.keys(name).length) return;
  const record = {
    shop_id: shop.id,
    name,
    emoji: String(form.get("emoji") ?? "").trim() || null,
    sort: Number(form.get("sort") ?? 0) || 0,
    is_active: form.get("is_active") !== null ? form.get("is_active") === "on" : true,
    slug: slugify(String(form.get("slug") || "") || name[shop.default_lang] || Object.values(name)[0]),
  };
  if (id) await supabase.from("categories").update(record).eq("id", id).eq("shop_id", shop.id);
  else await supabase.from("categories").insert(record);
  revalidatePath("/admin/categories");
}

export async function deleteCategory(form: FormData) {
  const { supabase, shop } = await requireAdmin();
  await supabase.from("categories").delete().eq("id", String(form.get("id"))).eq("shop_id", shop.id);
  revalidatePath("/admin/categories");
}

// ───────── settings ─────────
export async function saveSettings(form: FormData) {
  const { supabase, shop } = await requireAdmin();
  const langs = form.getAll("languages").map(String).filter((s) => ["uk", "pl", "en"].includes(s));
  const languages = langs.length ? langs : shop.languages;
  const defaultLang = languages.includes(String(form.get("default_lang"))) ? String(form.get("default_lang")) : languages[0];
  const domains = String(form.get("domains") ?? "")
    .split(/[\s,]+/)
    .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean);
  const logo = await uploadImages(shop.id, [form.get("logo") as File]);
  const welcomeImg = await uploadImages(shop.id, [form.get("tg_welcome_image_file") as File]);
  const payment = form.getAll("payment_methods").map(String).filter((m) => m === "test_card" || m === "cod");

  const { error } = await supabase
    .from("shops")
    .update({
      name: String(form.get("name") ?? shop.name).trim() || shop.name,
      domains,
      currency: String(form.get("currency") ?? shop.currency).trim().toUpperCase() || shop.currency,
      languages,
      default_lang: defaultLang,
      theme: {
        primary: String(form.get("theme_primary") ?? ""),
        accent: String(form.get("theme_accent") ?? ""),
        bg: String(form.get("theme_bg") ?? ""),
        surface: "#ffffff",
        text: String(form.get("theme_text") ?? ""),
        radius: `${Number(form.get("theme_radius") ?? 14) || 14}px`,
      },
      logo_url: logo[0] ?? (form.get("remove_logo") === "on" ? null : shop.logo_url),
      tagline: l10nFrom(form, "tagline", languages),
      hero_title: l10nFrom(form, "hero_title", languages),
      hero_text: l10nFrom(form, "hero_text", languages),
      delivery_note: l10nFrom(form, "delivery_note", languages),
      tg_welcome: l10nFrom(form, "tg_welcome", languages),
      tg_welcome_image: welcomeImg[0] ?? (String(form.get("tg_welcome_image") ?? "").trim() || null),
      min_order: parseMoney(String(form.get("min_order") ?? "")) ?? 0,
      delivery_fee: parseMoney(String(form.get("delivery_fee") ?? "")) ?? 0,
      free_delivery_from: parseMoney(String(form.get("free_delivery_from") ?? "")),
      payment_methods: payment.length ? payment : shop.payment_methods,
      support_username: String(form.get("support_username") ?? "").replace(/^@/, "").trim() || null,
      contact_phone: String(form.get("contact_phone") ?? "").trim() || null,
      contact_email: String(form.get("contact_email") ?? "").trim() || null,
      is_open: form.get("is_open") === "on",
    })
    .eq("id", shop.id);
  revalidatePath("/", "layout");
  redirect(`/admin/settings?${error ? "e=save" : "saved=1"}`);
}

export async function saveBot(form: FormData) {
  const { shop } = await requireAdmin(); // membership checked; secrets need the service role
  const token = String(form.get("bot_token") ?? "").trim();
  const chat = String(form.get("manager_chat_id") ?? "").trim();
  const patch: Record<string, string | null> = { manager_chat_id: chat || null };
  if (token && !token.includes("•")) patch.bot_token = token;
  await db().from("shop_secrets").upsert({ shop_id: shop.id, ...patch }, { onConflict: "shop_id" });

  let result = "saved";
  if (form.get("connect") === "1") {
    try {
      const username = await connectBot(shop);
      result = `connected&msg=${encodeURIComponent(username)}`;
    } catch (e) {
      result = `boterr&msg=${encodeURIComponent((e as Error).message)}`;
    }
  }
  redirect(`/admin/settings?bot=${result}#telegram`);
}

export async function testBot() {
  const { shop } = await requireAdmin();
  const { data: s } = await db().from("shop_secrets").select("bot_token, manager_chat_id").eq("shop_id", shop.id).single();
  let result = "tested";
  try {
    if (!s?.bot_token || !s.manager_chat_id) throw new Error("Token or chat id missing");
    await tg(s.bot_token, "sendMessage", { chat_id: s.manager_chat_id, text: `✅ ${shop.name}: сповіщення працюють` });
  } catch (e) {
    result = `boterr&msg=${encodeURIComponent((e as Error).message)}`;
  }
  redirect(`/admin/settings?bot=${result}#telegram`);
}
