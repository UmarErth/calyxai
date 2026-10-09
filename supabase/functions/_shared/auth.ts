import { createClient } from 'npm:@supabase/supabase-js@2.75.0'

export async function clients(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')!
  const publishable = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}').default ?? Deno.env.get('SUPABASE_ANON_KEY')!
  const secrets = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
  const secret = secrets.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authClient = createClient(url, publishable, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data, error } = await authClient.auth.getClaims()
  if (error || !data?.claims?.sub) throw new Error('Unauthorized')
  return { userId: data.claims.sub, userClient: authClient, admin: createClient(url, secret) }
}
