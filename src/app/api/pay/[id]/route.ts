import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/admin";
import { getShopById } from "@/lib/shop";
import { completeTestPayment, OrderError } from "@/lib/orders";

// Test payment provider endpoint. Replace with a Stripe / PayU webhook for real payments.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { token?: string; success?: boolean };

  const { data: order } = await db().from("orders").select("shop_id").eq("id", id).maybeSingle();
  if (!order) return NextResponse.json({ code: "not_found" }, { status: 404 });
  const shop = await getShopById(order.shop_id);
  if (!shop) return NextResponse.json({ code: "not_found" }, { status: 404 });

  try {
    await completeTestPayment(shop, id, String(body.token ?? ""), body.success !== false);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ code: e.code }, { status: 404 });
    console.error(e);
    return NextResponse.json({ code: "error" }, { status: 500 });
  }
}
