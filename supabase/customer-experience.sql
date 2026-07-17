alter table public.orders add column if not exists session_id uuid references public.table_sessions(id);

create table if not exists public.waiter_requests (
  id bigint generated always as identity primary key,
  table_id bigint not null references public.restaurant_tables(id),
  session_id uuid not null references public.table_sessions(id),
  status text not null default 'new' check (status in ('new','acknowledged','closed')),
  created_at timestamptz not null default now()
);
alter table public.waiter_requests enable row level security;
revoke all on public.waiter_requests from anon, authenticated;

create or replace function public.place_table_order(p_session_token text, p_items jsonb, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_session public.table_sessions; v_total numeric(10,2); v_order public.orders;
begin
  select * into v_session from public.table_sessions where session_token_hash = encode(extensions.digest(p_session_token, 'sha256'), 'hex') and expires_at > now();
  if not found then raise exception 'Η συνεδρία τραπεζιού έληξε. Σαρώστε ξανά το QR.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Μη έγκυρη παραγγελία.'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) x where coalesce((x->>'quantity')::int, 0) not between 1 and 20 or coalesce((x->>'price')::numeric, -1) < 0 or char_length(x->>'name') not between 1 and 120) then raise exception 'Μη έγκυρο προϊόν.'; end if;
  select round(sum((x->>'price')::numeric * (x->>'quantity')::int), 2) into v_total from jsonb_array_elements(p_items) x;
  insert into public.orders(table_id, session_id, items, notes, total) values (v_session.table_id, v_session.id, p_items, nullif(trim(p_notes), ''), v_total) returning * into v_order;
  return jsonb_build_object('order_number', v_order.order_number, 'total', v_order.total, 'status', v_order.status, 'created_at', v_order.created_at);
end $$;

create or replace function public.customer_session_summary(p_session_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_session public.table_sessions; v_label text; v_orders jsonb;
begin
  select * into v_session from public.table_sessions where session_token_hash=encode(extensions.digest(p_session_token,'sha256'),'hex') and expires_at>now();
  if not found then raise exception 'Session expired'; end if;
  select label into v_label from public.restaurant_tables where id=v_session.table_id;
  select coalesce(jsonb_agg(jsonb_build_object('order_number',o.order_number,'status',o.status,'items',o.items,'total',o.total,'created_at',o.created_at) order by o.created_at desc),'[]'::jsonb)
    into v_orders from public.orders o where o.session_id=v_session.id;
  return jsonb_build_object('session_token',p_session_token,'table_label',v_label,'expires_at',v_session.expires_at,'orders',v_orders);
end $$;

create or replace function public.customer_popular_items()
returns jsonb language sql security definer set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('name',name,'quantity',quantity) order by quantity desc),'[]'::jsonb)
  from (
    select x->>'name' name, sum((x->>'quantity')::int)::bigint quantity
    from public.orders o cross join lateral jsonb_array_elements(o.items) x
    where o.status <> 'cancelled' and o.created_at >= now()-interval '90 days'
    group by x->>'name' order by quantity desc limit 12
  ) popular;
$$;

create or replace function public.call_waiter(p_session_token text)
returns void language plpgsql security definer set search_path=public as $$
declare v_session public.table_sessions;
begin
  select * into v_session from public.table_sessions where session_token_hash=encode(extensions.digest(p_session_token,'sha256'),'hex') and expires_at>now();
  if not found then raise exception 'Session expired'; end if;
  if exists(select 1 from public.waiter_requests where session_id=v_session.id and status='new' and created_at>now()-interval '5 minutes') then return; end if;
  insert into public.waiter_requests(table_id,session_id) values(v_session.table_id,v_session.id);
end $$;

revoke all on function public.customer_session_summary(text),public.customer_popular_items(),public.call_waiter(text) from public;
grant execute on function public.customer_session_summary(text),public.customer_popular_items(),public.call_waiter(text) to anon;
grant execute on function public.place_table_order(text,jsonb,text) to anon;

create or replace function public.staff_list_waiter_requests()
returns table(id bigint,table_label text,created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_staff() then raise exception 'Not authorized'; end if;
  return query select w.id,t.label,w.created_at from public.waiter_requests w join public.restaurant_tables t on t.id=w.table_id where w.status='new' order by w.created_at;
end $$;
create or replace function public.staff_close_waiter_request(p_id bigint)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_staff() then raise exception 'Not authorized'; end if;
  update public.waiter_requests set status='closed' where id=p_id;
end $$;
revoke all on function public.staff_list_waiter_requests(),public.staff_close_waiter_request(bigint) from public;
grant execute on function public.staff_list_waiter_requests(),public.staff_close_waiter_request(bigint) to authenticated;
