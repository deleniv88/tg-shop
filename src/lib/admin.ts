import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { userDb } from "./supabase/server";
import type { Shop } from "./types";

/**
 * Current admin session + the shop being managed. RLS on the user client guarantees the
 * user only ever sees shops they are a member of.
 */
export async function requireAdmin() {
  const supabase = await userDb();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/admin/login");

  const { data: shops } = await supabase.from("shops").select("*").order("name");
  const list = (shops as Shop[]) ?? [];
  if (!list.length) redirect("/admin/login?e=noshop");

  const wanted = (await cookies()).get("admin_shop")?.value;
  const shop = list.find((s) => s.id === wanted) ?? list[0];
  return { supabase, user: auth.user, shop, shops: list };
}

/** Collect {"uk": "...", "pl": "..."} from form fields named `${prefix}_${lang}`. */
export function l10nFrom(form: FormData, prefix: string, langs: string[]) {
  const out: Record<string, string> = {};
  for (const l of langs) {
    const v = String(form.get(`${prefix}_${l}`) ?? "").trim();
    if (v) out[l] = v;
  }
  return out;
}

export function slugify(s: string) {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie", ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch",
    ш: "sh", щ: "shch", ь: "", ю: "iu", я: "ia", ы: "y", э: "e", ё: "e", ъ: "",
    ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
  };
  return (
    s
      .toLowerCase()
      .split("")
      .map((c) => map[c] ?? c)
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `item-${Date.now().toString(36)}`
  );
}
