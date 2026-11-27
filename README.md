# Vaani — one number, any service, your language

> Call one phone number, speak Telugu, Hindi or Indian English (mixed is fine), and an AI books your restaurant table or doctor's appointment. No app, no internet, no typing.

**Homingo Hack Days, Edition 01 · Track: LLM apps · Problem C2 "Voice is the interface" · Team PARK**

> 🚧 Work in progress — Phase 4 done: talk to Vaani by voice in the browser (Telugu, Hindi, Indian English); both demo bookings complete by voice. Text eval 40/40 on the real demo data (32/40 on first contact — see [EVAL.md](EVAL.md)). Websites, phone calls and the live URL land in later phases.

## The problem

Most Indians would rather talk than type, but every service is still built for typing.

- **Language barriers** — apps and IVRs are mostly English or formal Hindi.
- **Limited digital literacy** — forms, sign-ups, OTP flows.
- **Complicated booking apps** — many screens and filters.
- **Can't or won't type** — elderly callers, busy workers, non-Latin-script users.
- **Accessibility limits** — low vision, low literacy, keypad phones.
- **Poor customer service** — "press 1, press 2", hold times, limited hours.

## The solution

Vaani is **one phone number answered by one AI voice agent**. It understands code-mixed Telugu, Hindi and Indian English, finds the top 3 options, reads live free slots, books, and sends a WhatsApp confirmation. The business sees the booking flash on its partner portal (even on a TV) within about 2 seconds, and its public mini-site updates live.

- Two services: **restaurant tables** and **hospital/doctor appointments**
- Two demo areas in Hyderabad (Jubilee Hills, Gachibowli), 20 fictional businesses
- Always discloses it's an AI; emergencies are redirected to **108 / 112**; never asks for OTPs or card numbers
- The LLM talks, **code decides**: availability, limits and booking IDs are enforced in tools and the database

## Architecture

```
Phone (Twilio Media Streams)      Browser ("Talk to Vaani", WebRTC)
            \                         /
   Voice server: FastAPI + Pipecat (VAD → STT → LLM → normaliser → TTS)
   Pipecat Flows: Router → Restaurant agent | Hospital agent
   Tools (rules in code) → Supabase Postgres + Realtime
            /                 |                    \
   Next.js websites     WhatsApp / SMS        Payments (test mode)
```

**Contributing (people and AI agents):** read [AGENTS.md](AGENTS.md), check [docs/WORKLOG.md](docs/WORKLOG.md) for the current state, and pick a phase from [docs/PHASE_PROMPTS.md](docs/PHASE_PROMPTS.md).

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Contracts: [docs/CONTRACTS.md](docs/CONTRACTS.md) · Call flow: [docs/CALL_FLOW.md](docs/CALL_FLOW.md) · Websites: [docs/WEBSITES.md](docs/WEBSITES.md) · Full plan: [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md)

## Setup

Requirements: macOS/Linux, Docker Desktop, Python 3.11+, [uv](https://docs.astral.sh/uv/), Node 20+.

```bash
git clone <repo-url> vaani && cd vaani
cp .env.example .env                      # fill in keys as phases need them
uv sync                                   # Python deps
uv run python scripts/validate_data.py    # check the 9 data files
uv run pytest                             # tests (DB tests start a temporary Postgres if `initdb` is installed)
```

### Database (local Supabase)

```bash
brew install supabase/tap/supabase        # CLI; needs Docker Desktop running
supabase start                            # local Postgres + Realtime + Studio
supabase status                           # copy API URL, keys and DB URL into .env
uv run python scripts/db_apply.py         # schema.sql → rls.sql → seed.sql (wipes + reloads)
```

`supabase db reset` does the same thing (config.toml lists the three files as seed paths). To reseed with fresh dates (slots always cover today + 6 days, IST): `uv run python scripts/seed.py`. After editing `data/`, regenerate the committed seed with `uv run python scripts/make_seed_sql.py`.

Demo data in `data/` is the team's fictional set (10 restaurants, 10 hospitals, 51 doctors, 40 test calls), generated with [docs/DATA_PROMPT.md](docs/DATA_PROMPT.md). To load a regenerated set: `uv run python scripts/import_data.py <folder>` (fixes shape, then validates), then `uv run python scripts/make_seed_sql.py`. Unit tests use a frozen copy of the earlier placeholder set (`backend/tests/fixtures/placeholder_data/`); `backend/tests/test_real_data.py` checks the real set and the demo scenarios.

### Backend API

```bash
uv run uvicorn backend.api.app:app --reload --port 8000   # needs SUPABASE_DB_URL in .env
curl localhost:8000/health
uv run python scripts/partner_passcodes.py                  # demo passcodes for the partner portals
```

With `DEV_SIMULATE=true`, `POST /api/dev/simulate-booking {"business_id": "r_jh_01"}` makes a fake call book through the real tools, so the websites get the same live events as a phone call. Endpoints and tools: [docs/CONTRACTS.md](docs/CONTRACTS.md) §2–3.

### Chat with Vaani (text) and run the eval

Needs `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY` in `.env` (any OpenAI-compatible API) and local Postgres binaries (`brew install postgresql@16`) for the throwaway databases. Free option: Groq's free tier with several models chained (`LLM_MODEL=qwen/qwen3.8-27b@none,openai/gpt-oss-20b@low,openai/gpt-oss-120b@low`) plus an optional paid fallback (`LLM_FALLBACK_*`); see `.env.example`.

```bash
uv run python -m backend.flows.cli                 # chat in Telugu / Hindi / English
uv run python -m backend.eval.eval                 # replay the 40 test calls, table by language
uv run python -m backend.eval.eval --only T01 -v   # one call, with transcript (clock frozen at 09:00 IST; --real-clock to turn off)
```

### Talk to Vaani in the browser (voice, Phase 4)

Needs `SARVAM_API_KEY` (speech-to-text + Bulbul text-to-speech) and the `LLM_*` keys in `.env`.

```bash
uv run uvicorn backend.api.app:app --port 8000                       # with SUPABASE_DB_URL set
VAANI_DEV_DB=ephemeral SUPABASE_DB_URL= uv run uvicorn backend.api.app:app --port 8000   # no Supabase: throwaway local Postgres
```

Open <http://localhost:8000/voice-test> in Chrome, click **Call Vaani**, allow the microphone and speak Telugu, Hindi or Indian English. The page shows the live transcript with language tags, the agent's actions and the latency of every turn. The browser's "Talk to Vaani" buttons use the same `POST /webrtc/offer`.

Headless check (a synthetic caller over WebRTC, both demo scenarios, latency + barge-in):

```bash
uv run python -m backend.eval.voice_probe
uv run python -m backend.eval.voice_probe --scenario hindi_restaurant --barge-in
```

How it works: one Pipecat pipeline per call. Sarvam STT (saaras, romanised output) → Silero VAD + Smart Turn (end of turn, barge-in, silence) → `VaaniBrain` runs the Phase 3 `Session` (every guard and rule stays in code) → `voice/normalizer.py` spells out times, ₹ amounts, counts and IDs in te/hi/en → Sarvam Bulbul TTS. Code: `backend/voice/`.

Website setup steps are added as later phases land (Phase 7: one-command `docker compose up`).

## Run the frontend demo

With Docker Compose 2.24 or newer, run `docker compose up --build` and open http://localhost:3000. The frontend defaults to mock mode with scripted calls and booking updates. The backend defaults to a throwaway seeded Postgres instance when no `SUPABASE_DB_URL` is configured. For npm commands, live settings and demo passcodes, see [frontend/README.md](frontend/README.md).

## Evaluation

Measured, not just demoed — see [EVAL.md](EVAL.md) (booking accuracy by language, top-3 relevance, emergency and unsupported-area handling, latency, barge-in, naturalness, live sync, cost per minute).

## Screenshots

_Coming in Phase 8._

## Known limits

- Twilio trial: US number, verified callers only, max 5 calls at once, 75 minutes total, 10 minutes per call.
- 4 real phone calls at once in the demo; 10–15 concurrent shown via browser calls and the load test.
- 2 areas and 20 fictional businesses; production needs partner onboarding or booking-system integrations.
- Telugu, Hindi and Indian English are tested most; Tamil, Kannada and Malayalam are "supported, being tuned".
- Phone-line audio lowers speech-recognition accuracy compared with browser calls.
- WhatsApp Business Calling is not built (beta in India, needs a verified business).
- SMS to India may be filtered (DLT); WhatsApp sandbox needs each phone to join first.
- Partner portals use derived demo passcodes, and anyone with a booking ID can cancel it from the status page; payments are test mode only.
- All businesses, doctors, ratings and bookings are fictional sample data.

More: [docs/LIMITS.md](docs/LIMITS.md).

## Submission checklist

- [ ] Public repo, clean README with real screenshots + demo GIF
- [ ] 2–3 min demo video with real phones ringing
- [ ] Live frontend URL + callable number (or "call me" button)
- [ ] EVAL.md with real numbers (verification matrix)
- [x] Known limits section
- [x] LICENSE + ATTRIBUTIONS.md (final pass in Phase 8)
- [x] AI_USAGE.md (final pass in Phase 8)
- [x] Content depth: 20 businesses, 51 doctors, 40 test calls, phrases in 3 languages (real fictional set in `data/`)
- [ ] One-command setup: `docker compose up`
- [ ] Pitch deck

## Team PARK

Pranav (voice AI + integration) · Karthik (public websites + payments) · Akshit (partner portals, studio, logs, eval) · Rithvik (data, evaluation, demo). See [docs/TEAM.md](docs/TEAM.md).

## Licence

MIT — see [LICENSE](LICENSE). Third-party credits in [ATTRIBUTIONS.md](ATTRIBUTIONS.md); how we used AI tools in [AI_USAGE.md](AI_USAGE.md).
