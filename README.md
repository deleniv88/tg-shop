# tg-shop — магазин + Telegram Mini App на одному бекенді

Шаблон для запуску інтернет-магазину для різних клієнтів. Під кожного клієнта змінюються лише дані в адмінці, код той самий.

- **Сайт**: каталог, категорії, пошук, картка товару, кошик, оформлення замовлення. Мови UA/PL.
- **Telegram Mini App** (`/tg`): ті самі товари й кошик, нативні кнопки Telegram (MainButton, BackButton, haptics).
- **Бот** (webhook на Vercel): на `/start` надсилає вітання й кнопку «Відкрити магазин». Нові замовлення приходять менеджеру з кнопками зміни статусу, покупець отримує повідомлення про статус.
- **Адмінка** (`/admin`): замовлення, товари з фото, швидка зміна ціни й залишку, категорії, імпорт CSV, налаштування магазину, бренду, доставки й бота.
- **Тестова оплата**: «Картка (тест)» симулює успішний або відхилений платіж. Також є оплата при отриманні.
- **Мультимагазин**: усі таблиці мають `shop_id`, а RLS не дає адміну бачити чужі магазини. Магазин визначається за доменом або за `?shop=` у Mini App.

Стек: Next.js 16 (App Router), Supabase (Postgres, Auth, Storage), Telegram Bot API, Vercel.

---

## Запуск (≈15 хвилин)

### 1. Supabase: база

1. **SQL Editor → New query**: встав вміст `supabase/migrations/0001_init.sql` і натисни **Run**.
2. Нова вкладка: встав `supabase/seed.sql` і натисни **Run**. Створиться демо-магазин `demo` з 10 товарами.
3. **Authentication → Users → Add user → Create new user**: email і пароль для входу в адмінку, галочка *Auto Confirm User*.
4. У SQL Editor виконай, підставивши свій email:
   ```sql
   select public.add_shop_admin('you@example.com', 'demo');
   ```
5. **Project Settings → API Keys**: скопіюй *Project URL*, *anon / publishable* і *service_role / secret*. Вони знадобляться на кроці 3.

### 2. GitHub

Створи приватний репозиторій і залий у нього цю папку:
```bash
git init && git add . && git commit -m "tg-shop"
git branch -M main
git remote add origin https://github.com/<you>/tg-shop.git
git push -u origin main
```

### 3. Vercel

1. **Add New → Project** → обери репозиторій → **Deploy**. Перший деплой може впасти без змінних середовища, це нормально.
2. **Settings → Environment Variables** (для Production, Preview і Development):

   | Змінна | Значення |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key (**тільки сервер, нікому не показувати**) |
   | `DEFAULT_SHOP_SLUG` | `demo` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<твій-проєкт>.vercel.app` |

3. **Deployments → … → Redeploy**. Змінні з `NEXT_PUBLIC_` вшиваються під час збірки, тож після кожної їх зміни потрібен redeploy.

### 4. Telegram-бот

1. Відкрий `https://<проєкт>.vercel.app/admin` і увійди.
2. **Налаштування → Telegram-бот**: встав токен від @BotFather.
3. Напиши своєму боту `/id`, він відповість твоїм chat_id. Якщо замовлення мають приходити в групу менеджерів, додай бота в групу й напиши `/id` там. Встав це значення в поле «Chat ID менеджера».
4. Натисни **Зберегти й підключити бота**. Код сам налаштує webhook, кнопку меню з Mini App і команду /start.
5. Перевір кнопкою **Надіслати тестове повідомлення менеджеру**, потім напиши боту `/start` і зроби тестове замовлення.

---

## Новий клієнт

**Варіант A, одна база на всіх.**
1. Додай рядок у `shops` (простіше скопіювати й змінити `seed.sql`) і запис у `shop_secrets`.
2. Створи користувача й виконай `add_shop_admin('client@email', '<slug>')`.
3. Пропиши домен клієнта в *Налаштування → Домени* і в Vercel (**Settings → Domains**).
4. У клієнта свій бот: його токен вводиться в адмінці магазину клієнта.

Якщо в адміна кілька магазинів, в адмінці з'являється перемикач.

**Варіант B, окремий Supabase-проєкт і окремий деплой** на клієнта. Повна ізоляція даних і окремий рахунок за хостинг.

## Імпорт товарів

*Товари → Імпорт CSV*. Колонки: `slug, sku, category, name_uk, name_pl, description_uk, description_pl, unit, price, compare_at_price, stock, is_active, is_featured, image_url`. Обов'язкові лише назва й `price`. Рядки з тим самим `slug` оновлюються. З Excel зберігай як «CSV UTF-8».

## Справжня оплата (пізніше)

Тестовий провайдер живе в `src/lib/orders.ts` (`completeTestPayment`) і `src/app/api/pay/[id]/route.ts`. Для Stripe або PayU:
1. У `createOrder` створюй платіжну сесію провайдера.
2. Перенаправляй покупця на сторінку оплати провайдера.
3. У webhook провайдера став `payment_status = 'paid'` і викликай `notifyManager` та `notifyCustomer`, як у тестовому провайдері.

## Структура

```
supabase/migrations/0001_init.sql   схема, RLS, тригери, storage bucket
supabase/seed.sql                   демо-магазин
src/lib/                            shop (визначення магазину), orders, notify, bot, telegram (initData), i18n, money
src/app/(site)/                     сайт: головна, /c/[slug], /p/[slug], /cart, /checkout
src/app/(plain)/                    /pay/[id] (тестова оплата), /order/[id] (статус замовлення)
src/app/tg/                         Telegram Mini App
src/app/admin/                      адмінка + server actions
src/app/api/orders                  створення замовлення (сайт і Mini App)
src/app/api/bot/[shopId]            webhook бота
src/proxy.ts                        оновлення сесії адміна
```

## Безпека

- Ціни, залишки, мінімальна сума й доставка завжди перераховуються на сервері. Браузер передає лише id товарів і кількість.
- Підпис Telegram `initData` перевіряється токеном бота, тому підробити Telegram ID покупця не вийде.
- Webhook бота перевіряє секретний заголовок, а кнопки статусів працюють тільки з чату менеджера.
- Токен бота зберігається в `shop_secrets`. Ця таблиця без RLS-політик, тож дістатися до неї можна лише через service_role на сервері.

## Локально

```bash
cp .env.example .env.local   # заповни ключі
npm install
npm run dev                  # http://localhost:3000, адмінка /admin, Mini App /tg
```
Щоб відкрити Mini App у самому Telegram, потрібен HTTPS: деплой на Vercel або тунель (`cloudflared tunnel --url http://localhost:3000`).
