-- Demo shop with a few test products. Safe to re-run: it deletes and recreates the "demo" shop.
delete from public.shops where slug = 'demo';

with shop as (
  insert into public.shops (
    slug, name, domains, currency, languages, default_lang, theme,
    tagline, hero_title, hero_text,
    min_order, delivery_fee, free_delivery_from, delivery_note,
    payment_methods, support_username, contact_phone, contact_email, tg_welcome
  ) values (
    'demo', 'Smak Domu', '{localhost}', 'PLN', '{uk,pl}', 'uk',
    '{"primary":"#1f4d3a","accent":"#e8b04a","bg":"#f6f1e7","surface":"#ffffff","text":"#1c2420","radius":"14px"}',
    '{"uk":"Смак дому — поруч","pl":"Smak domu — blisko Ciebie"}',
    '{"uk":"Українські продукти з доставкою по Польщі","pl":"Ukraińskie produkty z dostawą w całej Polsce"}',
    '{"uk":"Свіжий хліб, вареники, крупи й солодощі. Замовляйте на сайті або в Telegram.","pl":"Świeże pieczywo, pierogi, kasze i słodycze. Zamawiaj na stronie lub w Telegramie."}',
    5000, 1499, 15000,
    '{"uk":"Доставка кур''єром 1–2 дні. Безкоштовно від 150 zł.","pl":"Dostawa kurierem 1–2 dni. Za darmo od 150 zł."}',
    '{test_card,cod}', null, '+48 000 000 000', 'hello@example.com',
    '{"uk":"👋 Вітаємо в Smak Domu!\n\nТут ви знайдете знайомі українські смаки.\n\n1️⃣ Відкрийте магазин\n2️⃣ Оберіть товари\n3️⃣ Оформіть замовлення","pl":"👋 Witamy w Smak Domu!\n\n1️⃣ Otwórz sklep\n2️⃣ Wybierz produkty\n3️⃣ Złóż zamówienie"}'
  ) returning id
),
secrets as (
  insert into public.shop_secrets (shop_id) select id from shop returning shop_id
),
cats as (
  insert into public.categories (shop_id, slug, name, emoji, sort)
  select shop.id, c.slug, c.name::jsonb, c.emoji, c.sort from shop,
  (values
    ('bakery',  '{"uk":"Хліб і випічка","pl":"Pieczywo"}', '🍞', 1),
    ('frozen',  '{"uk":"Заморожене","pl":"Mrożonki"}',     '❄️', 2),
    ('grocery', '{"uk":"Бакалія","pl":"Artykuły sypkie"}', '🌾', 3),
    ('dairy',   '{"uk":"Молочне","pl":"Nabiał"}',          '🥛', 4),
    ('sweets',  '{"uk":"Солодощі","pl":"Słodycze"}',       '🍬', 5),
    ('drinks',  '{"uk":"Напої","pl":"Napoje"}',            '🥤', 6)
  ) as c(slug, name, emoji, sort)
  returning id, slug, shop_id
)
insert into public.products (shop_id, category_id, slug, sku, name, description, ingredients, allergens, unit, price, compare_at_price, stock, is_featured, is_18plus, sort)
select cats.shop_id, cats.id, p.slug, p.sku, p.name::jsonb, p.description::jsonb, p.ingredients::jsonb, p.allergens::jsonb, p.unit, p.price, p.compare_at, p.stock, p.featured, false, p.sort
from cats join (values
  ('bakery',  'rye-bread',          'SD-001', '{"uk":"Хліб житній на заквасці","pl":"Chleb żytni na zakwasie"}', '{"uk":"Щільний ароматний хліб з коріандром.","pl":"Aromatyczny chleb z kolendrą."}', '{"uk":"Борошно житнє, вода, закваска, сіль, коріандр.","pl":"Mąka żytnia, woda, zakwas, sól, kolendra."}', '{"uk":"Містить глютен.","pl":"Zawiera gluten."}', '700 г', 1290, null::int, 30, true, 1),
  ('bakery',  'pampushky',          'SD-002', '{"uk":"Пампушки з часником","pl":"Pampuszki z czosnkiem"}', '{"uk":"Ідеально до борщу. 6 шт.","pl":"Idealne do barszczu. 6 szt."}', '{"uk":"Борошно пшеничне, вода, дріжджі, часник, олія.","pl":"Mąka pszenna, woda, drożdże, czosnek, olej."}', '{"uk":"Містить глютен.","pl":"Zawiera gluten."}', '6 шт.', 990, null, 20, false, 2),
  ('frozen',  'varenyky-potato',    'SD-010', '{"uk":"Вареники з картоплею","pl":"Pierogi z ziemniakami"}', '{"uk":"Ручна ліпка, заморожені.","pl":"Lepione ręcznie, mrożone."}', '{"uk":"Борошно, картопля, цибуля, олія, сіль.","pl":"Mąka, ziemniaki, cebula, olej, sól."}', '{"uk":"Містить глютен.","pl":"Zawiera gluten."}', '900 г', 2490, 2890, 40, true, 1),
  ('frozen',  'varenyky-cherry',    'SD-011', '{"uk":"Вареники з вишнею","pl":"Pierogi z wiśniami"}', '{"uk":"Солодкі вареники з вишнею.","pl":"Słodkie pierogi z wiśniami."}', '{"uk":"Борошно, вишня, цукор.","pl":"Mąka, wiśnie, cukier."}', '{"uk":"Містить глютен.","pl":"Zawiera gluten."}', '500 г', 1990, null, 25, false, 2),
  ('grocery', 'buckwheat',          'SD-020', '{"uk":"Гречка ядриця","pl":"Kasza gryczana"}', '{"uk":"Смажена гречка вищого ґатунку.","pl":"Prażona kasza gryczana."}', '{"uk":"Гречка.","pl":"Gryka."}', '{}', '1 кг', 1490, null, 60, true, 1),
  ('grocery', 'sunflower-oil',      'SD-021', '{"uk":"Олія соняшникова нерафінована","pl":"Olej słonecznikowy nierafinowany"}', '{"uk":"Ароматна, холодного віджиму.","pl":"Aromatyczny, tłoczony na zimno."}', '{"uk":"Олія соняшникова.","pl":"Olej słonecznikowy."}', '{}', '1 л', 1890, null, 35, false, 2),
  ('dairy',   'ryazhanka',          'SD-030', '{"uk":"Ряжанка 4%","pl":"Riażanka 4%"}', '{"uk":"Топлене ферментоване молоко.","pl":"Fermentowane mleko pieczone."}', '{"uk":"Молоко, закваска.","pl":"Mleko, zakwas."}', '{"uk":"Містить молоко.","pl":"Zawiera mleko."}', '450 г', 790, null, 15, false, 1),
  ('dairy',   'syrnyky-mix',        'SD-031', '{"uk":"Сирки глазуровані","pl":"Serki w polewie"}', '{"uk":"Сирні батончики у шоколадній глазурі. 4 шт.","pl":"Batoniki twarogowe w polewie. 4 szt."}', '{"uk":"Сир кисломолочний, цукор, глазур.","pl":"Twaróg, cukier, polewa."}', '{"uk":"Містить молоко, сою.","pl":"Zawiera mleko, soję."}', '4 × 36 г', 1190, 1390, 20, true, 2),
  ('sweets',  'candy-mix',          'SD-040', '{"uk":"Цукерки асорті","pl":"Cukierki mix"}', '{"uk":"Набір улюблених цукерок.","pl":"Zestaw ulubionych cukierków."}', '{"uk":"Цукор, какао-масло, молоко сухе, горіхи.","pl":"Cukier, masło kakaowe, mleko w proszku, orzechy."}', '{"uk":"Містить молоко, горіхи. Може містити арахіс.","pl":"Zawiera mleko, orzechy. Może zawierać orzeszki ziemne."}', '300 г', 2190, null, 18, false, 1),
  ('drinks',  'kvas',               'SD-050', '{"uk":"Квас хлібний","pl":"Kwas chlebowy"}', '{"uk":"Живого бродіння.","pl":"Naturalnie fermentowany."}', '{"uk":"Вода, житній солод, цукор, дріжджі.","pl":"Woda, słód żytni, cukier, drożdże."}', '{"uk":"Містить глютен.","pl":"Zawiera gluten."}', '1,5 л', 890, null, 0, false, 1)
) as p(cat, slug, sku, name, description, ingredients, allergens, unit, price, compare_at, stock, featured, sort)
on p.cat = cats.slug;
