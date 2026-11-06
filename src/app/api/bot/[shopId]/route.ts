import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/admin";
import { getShopById } from "@/lib/shop";
import { tg } from "@/lib/telegram";
import { sendWelcome } from "@/lib/bot";
import { managerKeyboard, managerText, notifyCustomer } from "@/lib/notify";
import { statusLabel } from "@/lib/i18n";
import type { Lang, Order, OrderItem, OrderStatus } from "@/lib/types";

type Update = {
  message?: { chat: { id: number; type: string }; from?: { language_code?: string }; text?: string };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number };
    message?: { chat: { id: number }; message_id: number };
  };
};

const STATUSES: OrderStatus[] = ["new", "confirmed", "shipped", "completed", "cancelled"];

// Telegram webhook — one endpoint per shop. Telegram sends the secret we set in setWebhook.
export async function POST(req: Request, { params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const { data: secrets } = await db().from("shop_secrets").select("*").eq("shop_id", shopId).maybeSingle();
  if (!secrets?.bot_token || req.headers.get("x-telegram-bot-api-secret-token") !== secrets.webhook_secret) {
    return new NextResponse("forbidden", { status: 403 });
  }
  const shop = await getShopById(shopId);
  if (!shop) return NextResponse.json({ ok: true });
  const token: string = secrets.bot_token;
  const update = (await req.json()) as Update;

  try {
    // ── /start and any other message: show the shop button ──
    if (update.message) {
      const m = update.message;
      const code = m.from?.language_code?.slice(0, 2);
      const lang = (code && shop.languages.includes(code as Lang) ? code : shop.default_lang) as Lang;
      if (m.text?.startsWith("/id")) {
        await tg(token, "sendMessage", { chat_id: m.chat.id, text: `chat_id: <code>${m.chat.id}</code>`, parse_mode: "HTML" });
      } else if (m.chat.type === "private") {
        await sendWelcome(shop, token, m.chat.id, lang);
      }
    }

    // ── manager presses a status button under an order ──
    const cq = update.callback_query;
    if (cq?.data?.startsWith("st:")) {
      const [, orderId, status] = cq.data.split(":");
      const fromManagerChat = String(cq.message?.chat.id) === String(secrets.manager_chat_id);
      if (!fromManagerChat || !STATUSES.includes(status as OrderStatus)) {
        await tg(token, "answerCallbackQuery", { callback_query_id: cq.id, text: "⛔" });
        return NextResponse.json({ ok: true });
      }
      const { data: order } = await db()
        .from("orders")
        .update({ status })
        .eq("id", orderId)
        .eq("shop_id", shop.id)
        .select("*")
        .single();
      if (order) {
        const { data: items } = await db().from("order_items").select("*").eq("order_id", orderId);
        if (cq.message) {
          await tg(token, "editMessageText", {
            chat_id: cq.message.chat.id,
            message_id: cq.message.message_id,
            text: managerText(shop, order as Order, (items as OrderItem[]) ?? []),
            parse_mode: "HTML",
            reply_markup: managerKeyboard(order as Order),
          }).catch(() => {});
        }
        await notifyCustomer(shop, orderId);
      }
      await tg(token, "answerCallbackQuery", {
        callback_query_id: cq.id,
        text: order ? statusLabel(status as OrderStatus, shop.default_lang) : "Not found",
      });
    }
  } catch (e) {
    console.error("bot webhook", e);
  }
  // Always 200 so Telegram doesn't retry the same update forever.
  return NextResponse.json({ ok: true });
}
