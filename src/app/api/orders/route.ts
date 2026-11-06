import { NextResponse } from "next/server";
import { getShop, getShopBySlug } from "@/lib/shop";
import { createOrder, OrderError, type OrderInput } from "@/lib/orders";
import { getSecrets } from "@/lib/notify";
import { validateInitData } from "@/lib/telegram";
import type { Lang } from "@/lib/types";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "bad_request" }, { status: 400 });
  }

  // The Mini App passes the shop slug (one deployment can host many bots); the site uses the domain.
  const shop = typeof body.shop === "string" ? await getShopBySlug(body.shop) : await getShop();
  if (!shop) return NextResponse.json({ code: "not_found" }, { status: 404 });

  const source = body.source === "tg" ? "tg" : "web";
  let tgUser = null;
  if (source === "tg" && typeof body.initData === "string" && body.initData) {
    const { bot_token } = await getSecrets(shop.id);
    tgUser = bot_token ? validateInitData(body.initData, bot_token) : null;
  }

  const lang = (shop.languages.includes(body.lang as Lang) ? body.lang : shop.default_lang) as Lang;

  try {
    const order = await createOrder(
      shop,
      {
        items: Array.isArray(body.items) ? (body.items as OrderInput["items"]) : [],
        name: String(body.name ?? ""),
        phone: String(body.phone ?? ""),
        email: String(body.email ?? ""),
        address: String(body.address ?? ""),
        city: String(body.city ?? ""),
        zip: String(body.zip ?? ""),
        comment: String(body.comment ?? ""),
        paymentMethod: body.paymentMethod === "cod" ? "cod" : "test_card",
        lang,
      },
      source,
      tgUser,
    );
    return NextResponse.json({
      id: order.id,
      number: order.number,
      token: order.access_token,
      paymentMethod: order.payment_method,
    });
  } catch (e) {
    if (e instanceof OrderError) {
      return NextResponse.json({ code: e.code, message: e.message }, { status: 422 });
    }
    console.error("create order", e);
    return NextResponse.json({ code: "error" }, { status: 500 });
  }
}
