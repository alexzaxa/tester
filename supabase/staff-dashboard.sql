create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'staff' check (role in ('staff','admin')),
  created_at timestamptz not null default now()
);
alter table public.staff_members add column if not exists role text not null default 'staff';
do $$ begin
  alter table public.staff_members add constraint staff_members_role_check check (role in ('staff','admin'));
exception when duplicate_object then null; end $$;
alter table public.staff_members enable row level security;
revoke all on public.staff_members from anon, authenticated;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.staff_members where user_id = auth.uid()) $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.staff_members where user_id = auth.uid() and role = 'admin') $$;

drop policy if exists "staff read tables" on public.restaurant_tables;
drop policy if exists "staff read orders" on public.orders;
drop policy if exists "staff update orders" on public.orders;

create or replace function public.staff_check_access()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Not authorized'; end if;
  return jsonb_build_object('allowed', true, 'role', (select role from public.staff_members where user_id=auth.uid()));
end $$;
create or replace function public.staff_list_orders()
returns table(id bigint, order_number bigint, table_label text, status text, items jsonb, notes text, total numeric, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Not authorized'; end if;
  return query select o.id,o.order_number,t.label,o.status,o.items,o.notes,o.total,o.created_at from public.orders o join public.restaurant_tables t on t.id=o.table_id where o.created_at > now()-interval '24 hours' and o.status not in ('delivered','cancelled') order by o.created_at desc;
end $$;
create or replace function public.staff_update_order_status(p_order_id bigint,p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Not authorized'; end if;
  if p_status not in ('new','preparing','ready','delivered','cancelled') then raise exception 'Invalid status'; end if;
  update public.orders set status=p_status,updated_at=now() where id=p_order_id;
end $$;
create or replace function public.staff_list_tables()
returns table(id bigint,label text,enabled boolean) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Not authorized'; end if;
  return query select t.id,t.label,t.enabled from public.restaurant_tables t order by t.id;
end $$;
create or replace function public.staff_set_table_enabled(p_table_id bigint,p_enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.restaurant_tables set enabled=p_enabled where id=p_table_id;
end $$;

revoke all on function public.is_staff(),public.is_admin() from public;
grant execute on function public.is_staff(),public.is_admin(),public.staff_check_access(),public.staff_list_orders(),public.staff_update_order_status(bigint,text),public.staff_list_tables(),public.staff_set_table_enabled(bigint,boolean) to authenticated;

-- After inviting a staff user in Authentication, approve them once:
-- insert into public.staff_members(user_id,display_name,role) select id,'Owner','admin' from auth.users where email='you@example.com' on conflict (user_id) do update set role='admin';
