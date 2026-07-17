create extension if not exists pgcrypto;

create table if not exists public.restaurant_tables (
  id bigint generated always as identity primary key,
  label text not null unique,
  qr_token_hash text not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id bigint not null references public.restaurant_tables(id),
  session_token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now()
);
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  order_number bigint generated always as identity unique,
  table_id bigint not null references public.restaurant_tables(id),
  status text not null default 'new' check (status in ('new','preparing','ready','delivered','cancelled')),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  notes text check (char_length(notes) <= 300),
  total numeric(10,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.restaurant_tables enable row level security;
alter table public.table_sessions enable row level security;
alter table public.orders enable row level security;
revoke all on public.restaurant_tables, public.table_sessions, public.orders from anon;
grant select, update on public.orders to authenticated;
grant select on public.restaurant_tables to authenticated;
create policy "staff read tables" on public.restaurant_tables for select to authenticated using (true);
create policy "staff read orders" on public.orders for select to authenticated using (true);
create policy "staff update orders" on public.orders for update to authenticated using (true) with check (true);

create or replace function public.start_table_session(p_qr_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_table public.restaurant_tables; v_session_token text; v_session public.table_sessions;
begin
  select * into v_table from public.restaurant_tables where enabled and qr_token_hash = encode(extensions.digest(p_qr_token, 'sha256'), 'hex');
  if not found then raise exception 'Το QR δεν είναι έγκυρο ή το τραπέζι δεν δέχεται παραγγελίες.'; end if;
  v_session_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.table_sessions(table_id, session_token_hash) values (v_table.id, encode(extensions.digest(v_session_token, 'sha256'), 'hex')) returning * into v_session;
  delete from public.table_sessions where expires_at < now();
  return jsonb_build_object('session_token', v_session_token, 'table_label', v_table.label, 'expires_at', v_session.expires_at);
end $$;

create or replace function public.place_table_order(p_session_token text, p_items jsonb, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_session public.table_sessions; v_total numeric(10,2); v_order public.orders;
begin
  select * into v_session from public.table_sessions where session_token_hash = encode(extensions.digest(p_session_token, 'sha256'), 'hex') and expires_at > now();
  if not found then raise exception 'Η συνεδρία τραπεζιού έληξε. Σαρώστε ξανά το QR.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Μη έγκυρη παραγγελία.'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) x where coalesce((x->>'quantity')::int, 0) not between 1 and 20 or coalesce((x->>'price')::numeric, -1) < 0 or char_length(x->>'name') not between 1 and 120) then raise exception 'Μη έγκυρο προϊόν.'; end if;
  select round(sum((x->>'price')::numeric * (x->>'quantity')::int), 2) into v_total from jsonb_array_elements(p_items) x;
  insert into public.orders(table_id, items, notes, total) values (v_session.table_id, p_items, nullif(trim(p_notes), ''), v_total) returning * into v_order;
  return jsonb_build_object('order_number', v_order.order_number, 'total', v_order.total);
end $$;
revoke all on function public.start_table_session(text) from public;
revoke all on function public.place_table_order(text,jsonb,text) from public;
grant execute on function public.start_table_session(text) to anon;
grant execute on function public.place_table_order(text,jsonb,text) to anon;

-- Run supabase/create-table-links.ps1 and then execute its generated table-seed.sql.
