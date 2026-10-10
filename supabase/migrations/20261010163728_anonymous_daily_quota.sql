create table public.anonymous_daily_usage (
  visitor_hash text not null,
  usage_date date not null default (timezone('utc', now()))::date,
  message_count smallint not null default 0 check (message_count between 0 and 10),
  updated_at timestamptz not null default now(),
  primary key (visitor_hash, usage_date)
);

alter table public.anonymous_daily_usage enable row level security;
revoke all on table public.anonymous_daily_usage from anon, authenticated;
grant select, insert, update, delete on table public.anonymous_daily_usage to service_role;

create function public.consume_anonymous_message(
  p_visitor_hash text,
  p_usage_date date default (timezone('utc', now()))::date
)
returns integer
language sql
security invoker
set search_path = ''
as $$
  insert into public.anonymous_daily_usage (visitor_hash, usage_date, message_count, updated_at)
  values (p_visitor_hash, p_usage_date, 1, now())
  on conflict (visitor_hash, usage_date) do update
    set message_count = public.anonymous_daily_usage.message_count + 1,
        updated_at = now()
    where public.anonymous_daily_usage.message_count < 10
  returning message_count;
$$;

revoke all on function public.consume_anonymous_message(text, date) from public, anon, authenticated;
grant execute on function public.consume_anonymous_message(text, date) to service_role;
