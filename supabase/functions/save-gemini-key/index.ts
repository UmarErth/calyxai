import { corsHeaders } from '../_shared/cors.ts'
import { clients } from '../_shared/auth.ts'
import { encrypt } from '../_shared/crypto.ts'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { apiKey } = await req.json()
    if (typeof apiKey !== 'string' || !apiKey.startsWith('AIza') || apiKey.length > 256) throw new Error('Enter a valid provider API key.')
    const { userId, admin } = await clients(req)
    const master = Deno.env.get('GEMINI_KEY_ENCRYPTION_SECRET')
    if (!master || master.length < 32) throw new Error('Server encryption is not configured.')
    const encrypted = await encrypt(apiKey, master)
    const { error } = await admin.from('user_secrets').upsert({ user_id: userId, gemini_key_ciphertext: encrypted.ciphertext, gemini_key_iv: encrypted.iv, updated_at: new Date().toISOString() })
    if (error) throw error
    return Response.json({ saved: true }, { headers: corsHeaders })
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: 400, headers: corsHeaders }) }
})
