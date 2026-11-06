import "server-only";
import { db } from "./supabase/admin";
import { getShopById } from "./shop";
import type { Order, OrderItem } from "./types";

/**
 * Load an order for the public status/payment pages. Requires the order's access token.
 * The shop comes from the order itself, so links work for every shop on the same domain.
 */
export async function getOrderByToken(id: string, token: string | undefined) {
  if (!token || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data: order } = await db().from("orders").select("*").eq("id", id).maybeSingle();
  if (!order || order.access_token !== token) return null;
  const shop = await getShopById(order.shop_id);
  if (!shop) return null;
  const { data: items } = await db().from("order_items").select("*").eq("order_id", id);
  return { shop, order: order as Order, items: (items as OrderItem[]) ?? [] };
}
