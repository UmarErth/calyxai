alter table private.user_integrations set schema public;
alter table public.user_integrations enable row level security;
revoke all on table public.user_integrations from public, anon, authenticated;
grant all on table public.user_integrations to service_role;

comment on table public.user_integrations is
  'Encrypted per-user credentials. RLS has no client policies; service-role Edge Functions are the only data path.';
