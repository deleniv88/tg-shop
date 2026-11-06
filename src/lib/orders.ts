import "server-only";
import { db } from "./supabase/admin";
import { deliveryFor, money } from "./money";
import { t, tr } from "./i18n";
import { notifyCustomer, notifyManager } from "./notify";
import type { Lang, PaymentMethod, Product, Shop } from "./types";
import type { TgUser } from "./telegram";

export type OrderInput = {
  items: { id: string; qty: number }[];
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  zip?: string;
  comment?: string;
  paymentMethod: PaymentMethod;
  lang: Lang;
};

export class OrderError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

const clean = (s: unknown, max = 300) => (typeof s === "string" ? s.trim().slice(0, max) : "");

/**
 * Creates an order from the cart. Prices, stock, minimum order and delivery are all
 * recomputed here from the database — the browser only sends product ids and quantities.
 */
export async function createOrder(shop: Shop, input: OrderInput, source: "web" | "tg", tgUser?: TgUser | null) {
  if (!shop.is_open) throw new OrderError("Shop is closed", "closed");

  const lang = input.lang;
  const name = clean(input.name, 120);
  const phone = clean(input.phone, 40);
  const address = clean(input.address);
  const city = clean(input.city, 80);
  if (!name || !phone || !address || !city) throw new OrderError("Missing required fields", "required");
  if (!shop.payment_methods.includes(input.paymentMethod)) throw new OrderError(t(lang, "errPayment"), "payment");

  // merge duplicate lines, drop junk
  const qtyById = new Map<string, number>();
  for (const it of input.items ?? []) {
    const qty = Math.floor(Number(it.qty));
    if (typeof it.id !== "string" || !(qty > 0) || qty > 999) continue;
    qtyById.set(it.id, (qtyById.get(it.id) ?? 0) + qty);
  }
  if (!qtyById.size) throw new OrderError(t(lang, "errEmpty"), "empty");

  const { data: rows, error } = await db()
    .from("products")
    .select("*")
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .in("id", [...qtyById.keys()]);
  if (error) throw error;
  const products = (rows as Product[]) ?? [];
  if (products.length !== qtyById.size) throw new OrderError(t(lang, "errUnavailable"), "unavailable");

  const lines = products.map((p) => {
    const qty = qtyById.get(p.id)!;
    if (p.stock !== null && p.stock < qty) {
      throw new OrderError(t(lang, "errStock", { name: tr(p.name, lang) }), "stock");
    }
    return { product: p, qty, total: p.price * qty };
  });

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  if (subtotal < shop.min_order) {
    throw new OrderError(t(lang, "errMinOrder", { amount: money(shop.min_order, shop.currency, lang) }), "min_order");
  }
  const delivery = deliveryFor(subtotal, shop.delivery_fee, shop.free_delivery_from);

  // reserve stock atomically; roll back what we took if one line fails
  const taken: { id: string; qty: number }[] = [];
  for (const l of lines) {
    if (l.product.stock === null) continue;
    const { data: ok } = await db().rpc("take_stock", { p_product: l.product.id, p_qty: l.qty });
    if (!ok) {
      await restoreStock(taken);
      throw new OrderError(t(lang, "errStock", { name: tr(l.product.name, lang) }), "stock");
    }
    taken.push({ id: l.product.id, qty: l.qty });
  }

  let customerId: string | null = null;
  if (tgUser?.id) {
    const { data: c } = await db()
      .from("customers")
      .upsert(
        {
          shop_id: shop.id,
          telegram_id: tgUser.id,
          telegram_username: tgUser.username ?? null,
          name,
          phone,
          email: clean(input.email, 120) || null,
          lang,
        },
        { onConflict: "shop_id,telegram_id" },
      )
      .select("id")
      .single();
    customerId = c?.id ?? null;
  }

  const { data: order, error: orderErr } = await db()
    .from("orders")
    .insert({
      shop_id: shop.id,
      source,
      payment_method: input.paymentMethod,
      payment_status: input.paymentMethod === "cod" ? "not_required" : "pending",
      customer_id: customerId,
      telegram_id: tgUser?.id ?? null,
      name,
      phone,
      email: clean(input.email, 120) || null,
      address,
      city,
      zip: clean(input.zip, 20) || null,
      comment: clean(input.comment, 1000) || null,
      lang,
      subtotal,
      delivery_fee: delivery,
      total: subtotal + delivery,
      currency: shop.currency,
    })
    .select("id, number, access_token, payment_method")
    .single();
  if (orderErr || !order) {
    await restoreStock(taken);
    throw orderErr ?? new Error("Order insert failed");
  }

  const { error: itemsErr } = await db()
    .from("order_items")
    .insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.product.id,
        name: `${tr(l.product.name, shop.default_lang)}${l.product.unit ? ` (${l.product.unit})` : ""}`,
        price: l.product.price,
        qty: l.qty,
        total: l.total,
      })),
    );
  if (itemsErr) {
    await db().from("orders").delete().eq("id", order.id);
    await restoreStock(taken);
    throw itemsErr;
  }

  // Cash on delivery: notify right away. Card: notify once the payment result is known.
  if (input.paymentMethod === "cod") {
    await notifyManager(shop, order.id);
    await notifyCustomer(shop, order.id);
  }

  return order as { id: string; number: number; access_token: string; payment_method: PaymentMethod };
}

async function restoreStock(taken: { id: string; qty: number }[]) {
  for (const t of taken) {
    const { data } = await db().from("products").select("stock").eq("id", t.id).single();
    if (data && data.stock !== null) {
      await db().from("products").update({ stock: data.stock + t.qty }).eq("id", t.id);
    }
  }
}

/** Test payment provider: marks the order paid or failed. Swap this for Stripe / PayU later. */
export async function completeTestPayment(shop: Shop, orderId: string, token: string, success: boolean) {
  const { data: order } = await db()
    .from("orders")
    .select("id, access_token, payment_status, payment_method")
    .eq("id", orderId)
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (!order || order.access_token !== token) throw new OrderError("Order not found", "not_found");
  if (order.payment_method !== "test_card" || order.payment_status === "paid") return order;

  await db()
    .from("orders")
    .update({ payment_status: success ? "paid" : "failed" })
    .eq("id", orderId);

  if (success) {
    await notifyManager(shop, orderId, "💳 <b>Оплачено</b>");
    await notifyCustomer(shop, orderId);
  }
  return order;
}
