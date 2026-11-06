import "server-only";
import { db } from "./supabase/admin";
import { escapeHtml, tg } from "./telegram";
import { money } from "./money";
import { paymentLabel, statusLabel, t } from "./i18n";
import type { Lang, Order, OrderItem, OrderStatus, Shop } from "./types";
import { shopBaseUrl } from "./shop";

type Secrets = { bot_token: string | null; manager_chat_id: string | null; bot_username: string | null };

export async function getSecrets(shopId: string): Promise<Secrets> {
  const { data } = await db()
    .from("shop_secrets")
    .select("bot_token, manager_chat_id, bot_username")
    .eq("shop_id", shopId)
    .maybeSingle();
  return (data as Secrets) ?? { bot_token: null, manager_chat_id: null, bot_username: null };
}

/** Inline keyboard the manager uses to move an order through statuses right from Telegram. */
export function managerKeyboard(order: Pick<Order, "id" | "status">) {
  const next: Record<OrderStatus, OrderStatus[]> = {
    new: ["confirmed", "cancelled"],
    confirmed: ["shipped", "cancelled"],
    shipped: ["completed"],
    completed: [],
    cancelled: [],
  };
  const icons: Record<OrderStatus, string> = {
    new: "🆕", confirmed: "✅", shipped: "🚚", completed: "🏁", cancelled: "✖️",
  };
  const buttons = next[order.status].map((s) => ({
    text: `${icons[s]} ${statusLabel(s, "uk")}`,
    callback_data: `st:${order.id}:${s}`,
  }));
  return buttons.length ? { inline_keyboard: [buttons] } : { inline_keyboard: [] };
}

export function managerText(shop: Shop, order: Order, items: OrderItem[]): string {
  const lang: Lang = shop.default_lang;
  const lines = items.map((i) => `• ${escapeHtml(i.name)} × ${i.qty} — ${money(i.total, order.currency, lang)}`);
  const src = order.source === "tg" ? "Telegram" : "Сайт";
  return [
    `🛒 <b>${t(lang, "orderNo", { n: order.number })}</b> · ${src}`,
    `${statusLabel(order.status, lang)} · ${paymentLabel(order.payment_status, lang)}`,
    "",
    ...lines,
    "",
    `${t(lang, "delivery")}: ${money(order.delivery_fee, order.currency, lang)}`,
    `<b>${t(lang, "total")}: ${money(order.total, order.currency, lang)}</b>`,
    "",
    `👤 ${escapeHtml(order.name)}`,
    `📞 ${escapeHtml(order.phone)}`,
    `📍 ${escapeHtml(order.address)}, ${escapeHtml(order.zip ?? "")} ${escapeHtml(order.city)}`,
    order.comment ? `💬 ${escapeHtml(order.comment)}` : "",
  ]
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
    .join("\n")
    .trim();
}

async function loadOrder(orderId: string) {
  const { data: order } = await db().from("orders").select("*").eq("id", orderId).single();
  const { data: items } = await db().from("order_items").select("*").eq("order_id", orderId);
  return { order: order as Order, items: (items as OrderItem[]) ?? [] };
}

/** Send (or re-send after payment) the order card to the shop's manager chat. Never throws. */
export async function notifyManager(shop: Shop, orderId: string, prefix?: string) {
  try {
    const s = await getSecrets(shop.id);
    if (!s.bot_token || !s.manager_chat_id) return;
    const { order, items } = await loadOrder(orderId);
    const text = (prefix ? `${prefix}\n\n` : "") + managerText(shop, order, items);
    const sent = await tg<{ message_id: number }>(s.bot_token, "sendMessage", {
      chat_id: s.manager_chat_id,
      text,
      parse_mode: "HTML",
      reply_markup: managerKeyboard(order),
    });
    await rememberCard(orderId, s.manager_chat_id, sent.message_id);
  } catch (e) {
    console.error("notifyManager", e);
  }
}

/** Remember a manager-chat message that shows this order, so later status changes can update it. */
export async function rememberCard(orderId: string, chatId: string | number, messageId: number) {
  await db()
    .from("order_tg_messages")
    .upsert(
      { order_id: orderId, chat_id: String(chatId), message_id: messageId },
      { onConflict: "order_id,chat_id,message_id", ignoreDuplicates: true },
    );
}

/**
 * Re-render every Telegram card of an order (text + status buttons) after its status or payment
 * changed — from the admin panel or from a button in Telegram. Never throws.
 */
export async function syncManagerCards(shop: Shop, orderId: string) {
  try {
    const s = await getSecrets(shop.id);
    if (!s.bot_token) return;
    const { data: cards } = await db().from("order_tg_messages").select("chat_id, message_id").eq("order_id", orderId);
    if (!cards?.length) return;
    const { order, items } = await loadOrder(orderId);
    const text = managerText(shop, order, items);
    for (const c of cards) {
      try {
        await tg(s.bot_token, "editMessageText", {
          chat_id: c.chat_id,
          message_id: c.message_id,
          text,
          parse_mode: "HTML",
          reply_markup: managerKeyboard(order),
        });
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes("message to edit not found") || msg.includes("message can't be edited")) {
          await db().from("order_tg_messages").delete().eq("order_id", orderId).eq("message_id", c.message_id);
        } else if (!msg.includes("message is not modified")) {
          console.error("syncManagerCards", msg);
        }
      }
    }
  } catch (e) {
    console.error("syncManagerCards", e);
  }
}

/** Tell the buyer (if the order came from Telegram) about a status or payment change. Never throws. */
export async function notifyCustomer(shop: Shop, orderId: string) {
  try {
    const s = await getSecrets(shop.id);
    if (!s.bot_token) return;
    const { order } = await loadOrder(orderId);
    if (!order.telegram_id) return;
    const lang = (order.lang as Lang) || shop.default_lang;
    const url = `${shopBaseUrl(shop)}/order/${order.id}?t=${order.access_token}`;
    await tg(s.bot_token, "sendMessage", {
      chat_id: order.telegram_id,
      text: [
        `📦 <b>${t(lang, "orderNo", { n: order.number })}</b>`,
        `${t(lang, "orderStatus")}: <b>${statusLabel(order.status, lang)}</b>`,
        `${t(lang, "paymentStatus")}: ${paymentLabel(order.payment_status, lang)}`,
        `${t(lang, "total")}: ${money(order.total, order.currency, lang)}`,
      ].join("\n"),
      parse_mode: "HTML",
      reply_markup: url.startsWith("https://")
        ? { inline_keyboard: [[{ text: "🔎 " + t(lang, "orderStatus"), web_app: { url } }]] }
        : undefined,
    });
  } catch (e) {
    console.error("notifyCustomer", e);
  }
}
