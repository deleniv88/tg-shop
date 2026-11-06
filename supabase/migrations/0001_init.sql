-- tg-shop: multi-tenant schema
-- Every business table carries shop_id. The storefront reads/writes through the
-- server with the service role key; the admin panel uses the signed-in user's
-- session, and RLS limits it to shops the user is a member of.

-- ───────────────────────── shops ─────────────────────────
create table public.shops (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  name                text not null,
  domains             text[] not null default '{}',          -- e.g. {shop.pl, www.shop.pl}
  currency            text not null default 'PLN',
  languages           text[] not null default '{uk,pl}',
  default_lang        text not null default 'uk',
  theme               jsonb not null default '{}'::jsonb,    -- {primary, accent, bg, surface, text, radius}
  logo_url            text,
  tagline             jsonb not null default '{}'::jsonb,    -- {"uk": "...", "pl": "..."}
  hero_title          jsonb not null default '{}'::jsonb,
  hero_text           jsonb not null default '{}'::jsonb,
  min_order           integer not null default 0,            -- minor units (grosze)
  delivery_fee        integer not null default 0,
  free_delivery_from  integer,                               -- null = never free
  delivery_note       jsonb not null default '{}'::jsonb,
  payment_methods     text[] not null default '{test_card,cod}',
  support_username    text,                                  -- telegram username without @
  contact_phone       text,
  contact_email       text,
  tg_welcome          jsonb not null default '{}'::jsonb,
  tg_welcome_image    text,
  is_open             boolean not null default true,
  created_at          timestamptz not null default now()
);

-- secrets are readable only with the service role (no RLS policies)
create table public.shop_secrets (
  shop_id          uuid primary key references public.shops(id) on delete cascade,
  bot_token        text,
  bot_username     text,
  webhook_secret   text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  manager_chat_id  text
);

create table public.shop_members (
  shop_id     uuid not null references public.shops(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner', 'manager')),
  created_at  timestamptz not null default now(),
  primary key (shop_id, user_id)
);

-- ───────────────────────── catalog ─────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  slug        text not null,
  name        jsonb not null default '{}'::jsonb,
  emoji       text,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (shop_id, slug)
);

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  shop_id           uuid not null references public.shops(id) on delete cascade,
  category_id       uuid references public.categories(id) on delete set null,
  slug              text not null,
  sku               text,
  name              jsonb not null default '{}'::jsonb,
  description       jsonb not null default '{}'::jsonb,
  ingredients       jsonb not null default '{}'::jsonb,
  allergens         jsonb not null default '{}'::jsonb,
  unit              text,                                   -- "500 г", "1 л"
  price             integer not null check (price >= 0),    -- minor units
  compare_at_price  integer check (compare_at_price is null or compare_at_price >= 0),
  stock             integer,                                -- null = not tracked
  is_active         boolean not null default true,
  is_featured       boolean not null default false,
  is_18plus         boolean not null default false,
  images            text[] not null default '{}',
  sort              integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (shop_id, slug)
);
create index products_shop_category_idx on public.products (shop_id, category_id) where is_active;

-- ───────────────────────── customers & orders ─────────────────────────
create table public.customers (
  id                 uuid primary key default gen_random_uuid(),
  shop_id            uuid not null references public.shops(id) on delete cascade,
  telegram_id        bigint,
  telegram_username  text,
  name               text,
  phone              text,
  email              text,
  lang               text,
  created_at         timestamptz not null default now(),
  unique (shop_id, telegram_id)
);

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  shop_id          uuid not null references public.shops(id) on delete cascade,
  number           integer,
  source           text not null default 'web' check (source in ('web', 'tg')),
  status           text not null default 'new'
                   check (status in ('new', 'confirmed', 'shipped', 'completed', 'cancelled')),
  payment_method   text not null,
  payment_status   text not null default 'pending'
                   check (payment_status in ('pending', 'paid', 'failed', 'not_required')),
  customer_id      uuid references public.customers(id) on delete set null,
  telegram_id      bigint,
  name             text not null,
  phone            text not null,
  email            text,
  address          text not null,
  city             text not null,
  zip              text,
  comment          text,
  lang             text,
  subtotal         integer not null,
  delivery_fee     integer not null default 0,
  total            integer not null,
  currency         text not null,
  access_token     text not null default replace(gen_random_uuid()::text, '-', ''),  -- for the order status page
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (shop_id, number)
);
create index orders_shop_created_idx on public.orders (shop_id, created_at desc);

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  name        text not null,
  price       integer not null,
  qty         integer not null check (qty > 0),
  total       integer not null
);
create index order_items_order_idx on public.order_items (order_id);

-- per-shop order numbers (1001, 1002, ...)
create or replace function public.set_order_number() returns trigger
language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.shop_id::text));
  select coalesce(max(number), 1000) + 1 into new.number
  from public.orders where shop_id = new.shop_id;
  return new;
end $$;

create trigger orders_set_number
  before insert on public.orders
  for each row when (new.number is null)
  execute function public.set_order_number();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- atomic stock decrement; returns false if not enough stock
create or replace function public.take_stock(p_product uuid, p_qty integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare left_qty integer;
begin
  update public.products set stock = stock - p_qty
  where id = p_product and (stock is null or stock >= p_qty)
  returning stock into left_qty;
  return found;
end $$;
revoke execute on function public.take_stock(uuid, integer) from public, anon, authenticated;

-- ───────────────────────── RLS ─────────────────────────
create or replace function public.is_shop_member(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.shop_members
    where shop_id = p_shop and user_id = auth.uid()
  );
$$;

alter table public.shops         enable row level security;
alter table public.shop_secrets  enable row level security;
alter table public.shop_members  enable row level security;
alter table public.categories    enable row level security;
alter table public.products      enable row level security;
alter table public.customers     enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;

create policy "members read shop"   on public.shops for select to authenticated using (public.is_shop_member(id));
create policy "members update shop" on public.shops for update to authenticated using (public.is_shop_member(id)) with check (public.is_shop_member(id));

create policy "own memberships" on public.shop_members for select to authenticated using (user_id = auth.uid());

create policy "members manage categories" on public.categories for all to authenticated
  using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));
create policy "members manage products" on public.products for all to authenticated
  using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));
create policy "members read customers" on public.customers for select to authenticated
  using (public.is_shop_member(shop_id));
create policy "members read orders" on public.orders for select to authenticated
  using (public.is_shop_member(shop_id));
create policy "members update orders" on public.orders for update to authenticated
  using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));
create policy "members read order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and public.is_shop_member(o.shop_id)));

-- ───────────────────────── storage ─────────────────────────
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- ───────────────────────── helpers ─────────────────────────
-- Give an existing Supabase Auth user access to a shop:
--   select public.add_shop_admin('you@example.com', 'demo');
create or replace function public.add_shop_admin(p_email text, p_shop_slug text, p_role text default 'owner')
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_shop uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(p_email);
  if v_user is null then raise exception 'User % not found. Create it in Authentication → Users first.', p_email; end if;
  select id into v_shop from public.shops where slug = p_shop_slug;
  if v_shop is null then raise exception 'Shop % not found', p_shop_slug; end if;
  insert into public.shop_members (shop_id, user_id, role) values (v_shop, v_user, p_role)
  on conflict (shop_id, user_id) do update set role = excluded.role;
end $$;
revoke execute on function public.add_shop_admin(text, text, text) from public, anon, authenticated;
