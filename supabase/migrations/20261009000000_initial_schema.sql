create type public.subscription_plan as enum ('free', 'starter', 'work', 'unlimited');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan public.subscription_plan not null default 'free',
  stripe_customer_id text unique,
  subscription_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_secrets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gemini_key_ciphertext text not null,
  gemini_key_iv text not null,
  updated_at timestamptz not null default now()
);

create table public.daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  message_count integer not null default 0 check (message_count >= 0),
  primary key (user_id, usage_date)
);

alter table public.profiles enable row level security;
alter table public.user_secrets enable row level security;
alter table public.daily_usage enable row level security;

create policy "Users can read their profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can read their usage" on public.daily_usage for select to authenticated using ((select auth.uid()) = user_id);
-- Secrets intentionally have no client policies. Edge Functions access them with a server-only secret key.

grant select on public.profiles, public.daily_usage to authenticated;
revoke all on public.user_secrets from anon, authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.consume_message(p_user_id uuid)
returns table (allowed boolean, used integer, daily_limit integer)
language plpgsql security definer set search_path = '' as $$
declare current_plan public.subscription_plan; plan_limit integer; next_count integer;
begin
  if p_user_id is distinct from auth.uid() then raise exception 'not authorized'; end if;
  select plan into current_plan from public.profiles where id = p_user_id;
  if current_plan = 'unlimited' then
    insert into public.daily_usage (user_id, usage_date, message_count) values (p_user_id, current_date, 1)
    on conflict (user_id, usage_date) do update set message_count = public.daily_usage.message_count + 1
    returning message_count into next_count;
    return query select true, next_count, null::integer;
    return;
  end if;
  plan_limit := case current_plan when 'work' then 500 when 'starter' then 500 else 50 end;
  insert into public.daily_usage (user_id, usage_date, message_count) values (p_user_id, current_date, 1)
  on conflict (user_id, usage_date) do update set message_count = public.daily_usage.message_count + 1
  where public.daily_usage.message_count < plan_limit returning message_count into next_count;
  if next_count is null then
    select message_count into next_count from public.daily_usage where user_id = p_user_id and usage_date = current_date;
    return query select false, next_count, plan_limit;
  else return query select true, next_count, plan_limit; end if;
end;
$$;
revoke all on function public.consume_message(uuid) from public, anon;
grant execute on function public.consume_message(uuid) to authenticated;

-- New Supabase projects may not expose new tables automatically. These explicit grants opt in only safe tables.
grant usage on schema public to authenticated;
