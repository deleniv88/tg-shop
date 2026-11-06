-- Telegram messages (order cards) sent to the manager chat, so a status change made
-- anywhere (admin panel or Telegram buttons) can update every card of that order.
create table if not exists public.order_tg_messages (
  order_id    uuid not null references public.orders(id) on delete cascade,
  chat_id     text not null,
  message_id  bigint not null,
  created_at  timestamptz not null default now(),
  primary key (order_id, chat_id, message_id)
);

-- service role only (no policies)
alter table public.order_tg_messages enable row level security;
