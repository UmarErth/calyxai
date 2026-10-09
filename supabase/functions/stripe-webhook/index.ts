import { createClient } from 'npm:@supabase/supabase-js@2.75.0'

const encoder = new TextEncoder()
function hex(bytes: ArrayBuffer) { return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('') }
function safeEqual(a: string, b: string) { if (a.length !== b.length) return false; let out = 0; for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i); return out === 0 }

async function verify(raw: string, header: string, secret: string) {
  const fields = Object.fromEntries(header.split(',').map(item => item.split('=', 2)))
  if (!fields.t || !fields.v1 || Math.abs(Date.now() / 1000 - Number(fields.t)) > 300) return false
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = hex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${fields.t}.${raw}`)))
  return safeEqual(signature, fields.v1)
}

Deno.serve(async req => {
  try {
    const raw = await req.text()
    const signingSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    if (!await verify(raw, req.headers.get('stripe-signature') ?? '', signingSecret)) return new Response('Invalid signature', { status: 400 })
    const event = JSON.parse(raw)
    const object = event.data?.object
    if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
      const userId = object.metadata?.user_id
      const requestedPlan = object.metadata?.plan
      const active = ['active', 'trialing'].includes(object.status)
      const plan = active && ['starter', 'work', 'unlimited'].includes(requestedPlan) ? requestedPlan : 'free'
      if (userId) {
        const url = Deno.env.get('SUPABASE_URL')!
        const secrets = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
        const admin = createClient(url, secrets.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        const { error } = await admin.from('profiles').update({ plan, stripe_customer_id: object.customer, subscription_status: object.status, updated_at: new Date().toISOString() }).eq('id', userId)
        if (error) throw error
      }
    }
    return Response.json({ received: true })
  } catch { return new Response('Webhook failed', { status: 400 }) }
})
