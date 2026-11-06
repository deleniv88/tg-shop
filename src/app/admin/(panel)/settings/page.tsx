import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/supabase/admin";
import { toMajor } from "@/lib/money";
import { LANG_LABEL } from "@/lib/i18n";
import { miniAppUrl, webhookUrl } from "@/lib/bot";
import type { L10n, Lang } from "@/lib/types";
import { saveBot, saveSettings, testBot } from "../../actions";

const ALL_LANGS: Lang[] = ["uk", "pl", "en"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; e?: string; bot?: string; msg?: string }>;
}) {
  const sp = await searchParams;
  const { shop } = await requireAdmin();
  const { data: secrets } = await db()
    .from("shop_secrets")
    .select("bot_token, bot_username, manager_chat_id")
    .eq("shop_id", shop.id)
    .maybeSingle();
  const th = shop.theme ?? {};

  const l10n = (name: string, label: string, value: L10n, textarea = false) => (
    <div className="stack" style={{ gap: 8 }}>
      {shop.languages.map((l) => (
        <div className="field" key={l}>
          <label htmlFor={`${name}_${l}`}>
            {label} <small>({LANG_LABEL[l]})</small>
          </label>
          {textarea ? (
            <textarea id={`${name}_${l}`} name={`${name}_${l}`} defaultValue={value?.[l] ?? ""} />
          ) : (
            <input id={`${name}_${l}`} name={`${name}_${l}`} defaultValue={value?.[l] ?? ""} />
          )}
        </div>
      ))}
    </div>
  );

  const color = (name: string, label: string, value: string | undefined, fallback: string) => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type="color" defaultValue={value || fallback} style={{ padding: 4, height: 40 }} />
    </div>
  );

  const masked = secrets?.bot_token ? `${secrets.bot_token.slice(0, 6)}••••••••${secrets.bot_token.slice(-4)}` : "";

  return (
    <>
      <h1>Налаштування</h1>
      {sp.saved && <div className="alert ok" style={{ marginBottom: 14 }}>Збережено ✓</div>}
      {sp.e && <div className="alert" style={{ marginBottom: 14 }}>Не вдалося зберегти</div>}

      <form action={saveSettings} className="admin-grid">
        <div className="stack" style={{ gap: 16 }}>
          <div className="panel stack">
            <b>Магазин</b>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="name">Назва</label>
                <input id="name" name="name" defaultValue={shop.name} required />
              </div>
              <div className="field">
                <label htmlFor="currency">Валюта</label>
                <input id="currency" name="currency" defaultValue={shop.currency} placeholder="PLN, DKK, EUR" />
              </div>
              <div className="field full">
                <label htmlFor="domains">Домени <small>(через кому: shop.pl, www.shop.pl)</small></label>
                <input id="domains" name="domains" defaultValue={shop.domains.join(", ")} />
              </div>
            </div>
            <div className="row" style={{ flexWrap: "wrap", gap: 16 }}>
              <span className="small" style={{ fontWeight: 600 }}>Мови:</span>
              {ALL_LANGS.map((l) => (
                <label key={l} className="check">
                  <input type="checkbox" name="languages" value={l} defaultChecked={shop.languages.includes(l)} /> {LANG_LABEL[l]}
                </label>
              ))}
              <span className="small" style={{ fontWeight: 600 }}>Основна:</span>
              <select name="default_lang" defaultValue={shop.default_lang} className="input" style={{ width: 90, minHeight: 36 }}>
                {ALL_LANGS.map((l) => (
                  <option key={l} value={l}>{LANG_LABEL[l]}</option>
                ))}
              </select>
            </div>
            <label className="check">
              <input type="checkbox" name="is_open" defaultChecked={shop.is_open} /> Магазин приймає замовлення
            </label>
          </div>

          <div className="panel stack">
            <b>Тексти на головній</b>
            {l10n("tagline", "Слоган", shop.tagline)}
            {l10n("hero_title", "Заголовок", shop.hero_title)}
            {l10n("hero_text", "Підзаголовок", shop.hero_text, true)}
          </div>

          <div className="panel stack">
            <b>Доставка й оплата</b>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="min_order">Мінімальне замовлення, {shop.currency}</label>
                <input id="min_order" name="min_order" inputMode="decimal" defaultValue={toMajor(shop.min_order)} />
              </div>
              <div className="field">
                <label htmlFor="delivery_fee">Ціна доставки, {shop.currency}</label>
                <input id="delivery_fee" name="delivery_fee" inputMode="decimal" defaultValue={toMajor(shop.delivery_fee)} />
              </div>
              <div className="field">
                <label htmlFor="free_delivery_from">Безкоштовно від, {shop.currency} <small>(порожньо = ніколи)</small></label>
                <input id="free_delivery_from" name="free_delivery_from" inputMode="decimal" defaultValue={toMajor(shop.free_delivery_from)} />
              </div>
            </div>
            {l10n("delivery_note", "Умови доставки", shop.delivery_note)}
            <div className="row" style={{ gap: 16 }}>
              <span className="small" style={{ fontWeight: 600 }}>Способи оплати:</span>
              <label className="check">
                <input type="checkbox" name="payment_methods" value="test_card" defaultChecked={shop.payment_methods.includes("test_card")} /> Картка (тест)
              </label>
              <label className="check">
                <input type="checkbox" name="payment_methods" value="cod" defaultChecked={shop.payment_methods.includes("cod")} /> При отриманні
              </label>
            </div>
          </div>

          <div className="panel stack">
            <b>Вітання в Telegram-боті</b>
            {l10n("tg_welcome", "Текст після /start", shop.tg_welcome, true)}
            <div className="field">
              <label htmlFor="tg_welcome_image">Картинка вітання <small>(URL)</small></label>
              <input id="tg_welcome_image" name="tg_welcome_image" defaultValue={shop.tg_welcome_image ?? ""} placeholder="https://…" />
            </div>
            <div className="field">
              <label htmlFor="tg_welcome_image_file">або завантажити</label>
              <input id="tg_welcome_image_file" name="tg_welcome_image_file" type="file" accept="image/*" />
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="panel stack">
            <b>Бренд</b>
            {shop.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.logo_url} alt="" style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 8, border: "1px solid #e7e5e4" }} />
            )}
            <div className="field">
              <label htmlFor="logo">Логотип</label>
              <input id="logo" name="logo" type="file" accept="image/*" />
            </div>
            {shop.logo_url && (
              <label className="check"><input type="checkbox" name="remove_logo" /> Прибрати логотип</label>
            )}
            <div className="form-grid">
              {color("theme_primary", "Основний", th.primary, "#1f4d3a")}
              {color("theme_accent", "Акцент", th.accent, "#e8b04a")}
              {color("theme_bg", "Фон", th.bg, "#f6f1e7")}
              {color("theme_text", "Текст", th.text, "#1c2420")}
            </div>
            <div className="field">
              <label htmlFor="theme_radius">Заокруглення, px</label>
              <input id="theme_radius" name="theme_radius" type="number" min={0} max={28} defaultValue={parseInt(th.radius ?? "14") || 14} />
            </div>
          </div>

          <div className="panel stack">
            <b>Контакти</b>
            <div className="field">
              <label htmlFor="support_username">Telegram підтримки <small>(без @)</small></label>
              <input id="support_username" name="support_username" defaultValue={shop.support_username ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="contact_phone">Телефон</label>
              <input id="contact_phone" name="contact_phone" defaultValue={shop.contact_phone ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="contact_email">Email</label>
              <input id="contact_email" name="contact_email" defaultValue={shop.contact_email ?? ""} />
            </div>
          </div>
          <button className="btn block" style={{ background: "#1c1917", height: 46 }}>Зберегти налаштування</button>
        </div>
      </form>

      <div id="telegram" className="panel stack" style={{ marginTop: 24, maxWidth: 760 }}>
        <b>Telegram-бот</b>
        {sp.bot === "connected" && (
          <div className="alert ok">Бот підключено ✓ Відкрийте @{sp.msg ?? secrets?.bot_username} і натисніть /start.</div>
        )}
        {sp.bot === "saved" && <div className="alert ok">Збережено ✓</div>}
        {sp.bot === "tested" && <div className="alert ok">Тестове повідомлення надіслано ✓</div>}
        {sp.bot === "boterr" && <div className="alert">Помилка: {sp.msg}</div>}

        <ol className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Створіть бота в @BotFather (<code>/newbot</code>) і вставте токен нижче.</li>
          <li>Напишіть своєму боту <code>/id</code> (або в групі менеджерів) і вставте chat_id нижче.</li>
          <li>Натисніть «Зберегти й підключити». Бот отримає кнопку меню й webhook.</li>
        </ol>

        <form action={saveBot} className="stack">
          <div className="field">
            <label htmlFor="bot_token">Токен бота {secrets?.bot_username && <small>(@{secrets.bot_username})</small>}</label>
            <input id="bot_token" name="bot_token" defaultValue={masked} placeholder="123456789:AA…" autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="manager_chat_id">Chat ID менеджера <small>(куди приходять замовлення)</small></label>
            <input id="manager_chat_id" name="manager_chat_id" defaultValue={secrets?.manager_chat_id ?? ""} placeholder="123456789 або -100…" />
          </div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button className="btn ghost" name="connect" value="0">Зберегти</button>
            <button className="btn" name="connect" value="1" style={{ background: "#1c1917" }}>Зберегти й підключити бота</button>
          </div>
        </form>
        <form action={testBot}>
          <button className="btn sm ghost">Надіслати тестове повідомлення менеджеру</button>
        </form>
        <div className="small muted">
          Mini App: <code>{miniAppUrl(shop)}</code>
          <br />
          Webhook: <code>{webhookUrl(shop)}</code>
        </div>
      </div>
    </>
  );
}
