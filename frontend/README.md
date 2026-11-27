# Vaani frontend

The Next.js app includes business directory, availability, booking status, partner schedules, Live Call Studio, call logs, and evaluation.

## Run locally

Requires Node.js 20.9 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The root route currently opens the directory. The DeepSeek Harness landing source is needed for the final root page. The default mode is mock and requires no credentials. Try the restaurant and hospital replays at `/studio`. The replay books for tomorrow. To see it update in another tab, sign in via `/partner/login` with the mock passcode `000000`, select Tamarind Lantern or Asterline Clinic, and set the date to tomorrow. Call logs and mock bookings persist in the current browser. For the hospital replay, the booking status page links to a test payment.

## Live demo configuration

Copy `.env.example` to `.env.local` and fill in these values. Rebuild after changing a public variable in a deployment.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_DATA_MODE` | `mock` or `live` |
| `NEXT_PUBLIC_BACKEND_URL` | FastAPI origin accessible from the browser |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL for call logs |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key under the demo RLS grants |
| `NEXT_PUBLIC_VAANI_PHONE` | Configured phone number, in E.164 |
| `NEXT_PUBLIC_DEV_SIMULATE` | Show the API simulator in live partner portals when the backend has `DEV_SIMULATE=true` |

Live booking screens refresh through FastAPI. The browser call button opens the existing WebRTC console. Live call logs use the documented demo database grants and are for fictional test calls. When Supabase is configured, Realtime notifications trigger a refresh in addition to the timed fallback. Hosted Realtime and call-to-portal timing still need end-to-end verification.

Get live demo partner passcodes on the backend with `uv run python scripts/partner_passcodes.py`. The browser holds the selected partner passcode for the current tab and sends it through the API header.

## Checks

```sh
npm run lint
npm run typecheck
npx playwright install chromium
npm run test:e2e
npm run build
```

Set `VAANI_CHROMIUM_PATH` when using a system Chromium.
