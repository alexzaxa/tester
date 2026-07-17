create or replace function public.staff_clear_operational_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orders bigint;
  v_sessions bigint;
  v_history bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select count(*) into v_orders from public.orders;
  select count(*) into v_sessions from public.table_sessions;
  select count(*) into v_history from public.table_status_history;

  delete from public.table_sessions;
  delete from public.table_status_history;
  delete from public.orders;

  return jsonb_build_object('orders', v_orders, 'sessions', v_sessions, 'history', v_history);
end;
$$;

revoke all on function public.staff_clear_operational_data() from public;
grant execute on function public.staff_clear_operational_data() to authenticated;

