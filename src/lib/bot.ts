import "server-only";
import { db } from "./supabase/admin";
import { tg } from "./telegram";
import { shopBaseUrl } from "./shop";
import { t, tr } from "./i18n";
import type { Lang, Shop } from "./types";

export function miniAppUrl(shop: Shop) {
  return `${shopBaseUrl(shop)}/tg?shop=${encodeURIComponent(shop.slug)}`;
}

export function webhookUrl(shop: Shop) {
  return `${(process.env.NEXT_PUBLIC_SITE_URL || shopBaseUrl(shop)).replace(/\/$/, "")}/api/bot/${shop.id}`;
}

/**
 * Connects the shop's bot: sets the webhook (with a secret header), the menu button that
 * opens the Mini App, and the /start command. Called from the admin settings page.
 */
export async function connectBot(shop: Shop) {
  const { data: s } = await db().from("shop_secrets").select("*").eq("shop_id", shop.id).single();
  if (!s?.bot_token) throw new Error("Bot token is empty");
  const token: string = s.bot_token;

  const me = await tg<{ username: string }>(token, "getMe");
  await tg(token, "setWebhook", {
    url: webhookUrl(shop),
    secret_token: s.webhook_secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  const lang = shop.default_lang;
  await tg(token, "setChatMenuButton", {
    menu_button: { type: "web_app", text: t(lang, "toCatalog"), web_app: { url: miniAppUrl(shop) } },
  });
  await tg(token, "setMyCommands", { commands: [{ command: "start", description: shop.name }] });

  await db().from("shop_secrets").update({ bot_username: me.username }).eq("shop_id", shop.id);
  return me.username;
}

export async function sendWelcome(shop: Shop, token: string, chatId: number, lang: Lang) {
  const text =
    tr(shop.tg_welcome, lang, shop.default_lang) || `👋 ${shop.name}\n\n${tr(shop.tagline, lang, shop.default_lang)}`;
  const keyboard: { text: string; web_app?: { url: string }; url?: string }[][] = [
    [{ text: `🛒 ${t(lang, "toCatalog")}`, web_app: { url: miniAppUrl(shop) } }],
  ];
  if (shop.support_username) {
    keyboard.push([{ text: `💬 ${t(lang, "support")}`, url: `https://t.me/${shop.support_username}` }]);
  }
  const reply_markup = { inline_keyboard: keyboard };
  if (shop.tg_welcome_image) {
    await tg(token, "sendPhoto", { chat_id: chatId, photo: shop.tg_welcome_image, caption: text, reply_markup });
  } else {
    await tg(token, "sendMessage", { chat_id: chatId, text, reply_markup });
  }
}
