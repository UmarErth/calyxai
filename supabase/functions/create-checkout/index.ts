import { corsHeaders } from '../_shared/cors.ts'
import { clients } from '../_shared/auth.ts'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { plan, returnUrl } = await req.json()
    if (!['starter', 'work', 'unlimited'].includes(plan)) throw new Error('Invalid plan.')
    const { userId } = await clients(req)
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const priceId = Deno.env.get(plan === 'unlimited' ? 'STRIPE_UNLIMITED_PRICE_ID' : plan === 'work' ? 'STRIPE_WORK_PRICE_ID' : 'STRIPE_STARTER_PRICE_ID')
    if (!stripeKey || !priceId) throw new Error('Payments are not configured.')
    const body = new URLSearchParams({ mode: 'subscription', 'line_items[0][price]': priceId, 'line_items[0][quantity]': '1', success_url: `${returnUrl}?checkout=success`, cancel_url: `${returnUrl}?checkout=cancelled`, client_reference_id: userId, 'subscription_data[metadata][user_id]': userId, 'subscription_data[metadata][plan]': plan })
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    const session = await response.json()
    if (!response.ok) throw new Error(session?.error?.message ?? 'Checkout failed.')
    return Response.json({ url: session.url }, { headers: corsHeaders })
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: 400, headers: corsHeaders }) }
})
