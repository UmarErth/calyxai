alter table public.user_integrations
  drop constraint if exists user_integrations_provider_check;

alter table public.user_integrations
  add constraint user_integrations_provider_check
  check (provider in ('github', 'cloudflare', 'notion', 'slack', 'google_drive', 'linear', 'mcp', 'custom'));

comment on column public.user_integrations.config is
  'Provider configuration and non-secret MCP tool metadata. Credentials remain encrypted in encrypted_secret.';
