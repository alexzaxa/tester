create table if not exists public.table_status_history (
  id bigint generated always as identity primary key,
  table_id bigint not null references public.restaurant_tables(id),
  enabled boolean not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);
alter table public.table_status_history enable row level security;
revoke all on public.table_status_history from anon,authenticated;

create or replace function public.staff_set_table_enabled(p_table_id bigint,p_enabled boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if not exists(select 1 from public.restaurant_tables where id=p_table_id and enabled is distinct from p_enabled) then return; end if;
  update public.restaurant_tables set enabled=p_enabled where id=p_table_id;
  insert into public.table_status_history(table_id,enabled,changed_by) values(p_table_id,p_enabled,auth.uid());
end $$;

create or replace function public.staff_daily_summary()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_income numeric(10,2);v_delivered bigint;v_all bigint;
begin
  if not public.is_staff() then raise exception 'Not authorized'; end if;
  select coalesce(sum(total),0),count(*) into v_income,v_delivered from public.orders where status='delivered' and created_at >= (date_trunc('day',now() at time zone 'Europe/Athens') at time zone 'Europe/Athens');
  select count(*) into v_all from public.orders where created_at >= (date_trunc('day',now() at time zone 'Europe/Athens') at time zone 'Europe/Athens');
  return jsonb_build_object('income',v_income,'delivered_orders',v_delivered,'all_orders',v_all);
end $$;

create or replace function public.staff_table_history()
returns table(id bigint,table_label text,enabled boolean,changed_at timestamptz,changed_by_email text)
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return query select h.id,t.label,h.enabled,h.changed_at,u.email::text from public.table_status_history h join public.restaurant_tables t on t.id=h.table_id left join auth.users u on u.id=h.changed_by order by h.changed_at desc limit 200;
end $$;

grant execute on function public.staff_daily_summary(),public.staff_table_history() to authenticated;
grant execute on function public.staff_set_table_enabled(bigint,boolean) to authenticated;
