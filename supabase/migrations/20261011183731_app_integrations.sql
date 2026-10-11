create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('github', 'cloudflare', 'notion', 'slack', 'google_drive', 'linear', 'custom')),
  name text not null check (char_length(name) between 1 and 80),
  encrypted_secret text not null,
  secret_iv text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, name)
);

alter table private.user_integrations enable row level security;
revoke all on table private.user_integrations from public, anon, authenticated;

create index user_integrations_owner_idx
  on private.user_integrations (user_id, updated_at desc);

comment on table private.user_integrations is
  'Encrypted per-user credentials. Accessible only from authenticated Edge Functions using the service role.';
