# Calyx AI

An open-source, Claude-inspired Gemini workspace with a calm serif interface, encrypted bring-your-own-key storage, Supabase authentication, daily usage limits, Stripe subscriptions, and a permission-conscious Chrome extension.

> Early open-source release. Connect your own Supabase, Gemini, and Stripe projects before production use.

## Plans

| Plan | Price | Daily messages | Highlights |
| --- | ---: | ---: | --- |
| Free | $0 | 50 | Gemini chat, encrypted BYOK |
| Starter | $5/month | 500 | Longer projects, priority, exports |
| Work | $10/month | 500 | Work canvas and Chrome extension |
| Unlimited | $20/month | Unlimited | Every feature and highest priority |

Unlimited remains subject to reasonable abuse prevention and upstream provider availability. The Work extension starts with active-tab context sharing and explicit user approval; automated actions should only be added through a visible preview-and-confirm flow.

## Stack

- React, TypeScript, and Vite
- Supabase Auth, Postgres, RLS, and Edge Functions
- Gemini `gemini-3.8-flash` via Google’s REST API
- Stripe Checkout and signed subscription webhooks
- Manifest V3 Chrome extension

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local`, then add your Supabase project URL and publishable key. Never use a secret or service-role key in the frontend.
3. Create or link a Supabase project and apply `supabase/migrations/20261009000000_initial_schema.sql`.
4. Set the Edge Function secrets shown in `supabase/functions/.env.example`. Use a random value of at least 32 characters for `GEMINI_KEY_ENCRYPTION_SECRET` and keep it backed up; changing it makes saved user keys unreadable.
5. Deploy the four functions in `supabase/functions`.
6. Create Stripe recurring prices for $5, $10, and $20. Add their IDs as secrets and point a Stripe webhook at `stripe-webhook` for subscription created, updated, and deleted events.
7. Run `npm run dev`.

Supabase’s publishable key is designed for browser use when RLS is enabled. Gemini keys are sent to `save-gemini-key`, encrypted with AES-256-GCM, and stored as ciphertext. The encryption master key and Supabase secret key stay in Edge Function secrets.

## Reliability prompt

The system prompt lives in `supabase/functions/_shared/system-prompt.ts`. It asks Calyx to distinguish facts from inference, surface uncertainty, verify calculations, resist prompt injection, protect secrets, and never claim tool execution without evidence. Prompting improves behavior but cannot guarantee that a model will always be correct; the UI keeps that limitation visible.

## Chrome extension

Open `chrome://extensions`, enable Developer mode, and load the `extension` directory unpacked. See `extension/README.md` for its narrow permission model.

## Security notes

- Every exposed user-data table has RLS enabled.
- `user_secrets` is inaccessible to browser roles.
- Daily limits are incremented atomically in Postgres.
- Webhook signatures are verified before subscription state changes.
- No real credentials belong in Git. Environment files are ignored.
- Before production, restrict CORS to the deployed origin and add abuse monitoring, retention controls, and a key-rotation flow.

## Contact

Support email coming soon. Replace this section when the project’s public support address is chosen.

## Contributing

Issues and pull requests are welcome. Keep permissions narrow, avoid hidden automation, and add tests for security-sensitive changes.

## License

GNU Affero General Public License v3.0. See [LICENSE](LICENSE).
