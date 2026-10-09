import { corsHeaders } from '../_shared/cors.ts'
import { clients } from '../_shared/auth.ts'
import { decrypt } from '../_shared/crypto.ts'
import { CALYX_SYSTEM_PROMPT } from '../_shared/system-prompt.ts'

type InputMessage = { role: 'user' | 'assistant'; content: string }

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { messages } = await req.json() as { messages: InputMessage[] }
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100) throw new Error('Invalid conversation.')
    if (messages.some(m => !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 50_000)) throw new Error('Invalid message.')
    const { userId, userClient, admin } = await clients(req)
    const { data: usage, error: usageError } = await userClient.rpc('consume_message', { p_user_id: userId }).single()
    if (usageError) throw usageError
    if (!usage.allowed) return Response.json({ error: `Daily limit reached (${usage.daily_limit}).` }, { status: 429, headers: corsHeaders })
    const { data: stored, error: secretError } = await admin.from('user_secrets').select('gemini_key_ciphertext, gemini_key_iv').eq('user_id', userId).single()
    if (secretError || !stored) throw new Error('Add your Gemini API key in Settings first.')
    const master = Deno.env.get('GEMINI_KEY_ENCRYPTION_SECRET')
    if (!master) throw new Error('Server encryption is not configured.')
    const apiKey = await decrypt(stored.gemini_key_ciphertext, stored.gemini_key_iv, master)
    const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: CALYX_SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.45, topP: 0.9, maxOutputTokens: 8192 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result?.error?.message ?? 'Gemini request failed.')
    const text = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('')
    if (!text) throw new Error('Gemini returned no text.')
    return Response.json({ text, usage: { used: usage.used, limit: usage.daily_limit } }, { headers: corsHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed'
    const status = message === 'Unauthorized' ? 401 : 400
    return Response.json({ error: message }, { status, headers: corsHeaders })
  }
})
