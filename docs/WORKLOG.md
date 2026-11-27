# Vaani — work log

Every agent session adds an entry here (rules and template: `AGENTS.md` §5). **Newest first.** Read the latest entry before you start. Times are IST; past phases use their commit times (`git log`).

## Current state (keep this short and up to date)

| Phase | Status | Owner | Where |
|---|---|---|---|
| 0 Repo + docs | ✅ done | Pranav | `main` @ `d33536a` |
| 1 Data + database | ✅ done (local Supabase check pending — Docker Desktop wasn't starting) | Pranav | `main` @ `9a2f0b8` |
| 2 Tools + API | ✅ done | Pranav | `main` @ `7343662` |
| 3 Text-mode agent + eval | ✅ done; re-checked on real data | Pranav (via Claude Code) | `main` via PR #1; real data on `data-real-import` |
| 4 Voice over browser | ✅ done (synthetic callers; live-mic check pending) | Pranav (via Claude Code) | `phase-4-voice` |
| 5 Websites | 🟡 in progress outside this repo | Akshit, Karthik | `docs/FRONTEND_PROMPT.md` |
| 6 Phone calls + WhatsApp | ⬜ not started (needs Twilio) | open | — |
| 7 Integration, eval, deploy | ⬜ not started | open | — |
| 8 Submission polish | ⬜ not started | open | — |

Baseline on `main`: **195 passed** · ruff ✓ · mypy ✓ · eval 40/40 (placeholder data). On `main`: **311 passed** (after the self-harm PR); `llm-groq-free`: **316 passed** · ruff ✓ · mypy ✓ · `validate_data.py` ✓ (real data, 0 errors, 7 warnings) · eval on real data 32/40 first run → 40/40 × 5.

## Entries

### 2026-11-27 12:46 IST · Phase 5 · Akshit via Codex · handed off
**Branch:** feat/vaani-demo-integration
**Goal:** Integrate the frontend foundation with upstream booking and voice flows.
**Done:** Integrated the frontend foundation with public availability, booking status, mock payments, partner access, restaurant and hospital schedules, TV mode, Studio replay, call logs and evaluation. Added Docker build files and Compose wiring.
**Checks:** Node smoke run passed both replays, booking notifications, slot release, mock payment, doctor leave, call logs, live catalogue mapping and Realtime frame handling. Changed frontend routes and modules passed TypeScript checking with cached framework types. The locked npm install failed because matching package tarballs were missing locally and the npm registry was unreachable. Playwright and Docker builds are pending.
**Decisions:** Live-mode booking views use FastAPI refreshes and the existing browser voice console. Call logs use the Supabase demo read policy. Supabase Realtime notifications invalidate live booking, availability, and call-list reads; timed polling provides a fallback. The evaluation page uses the existing 23 Nov measurements.
**Pending:** Integrate the user’s DeepSeek Harness landing once its source is identified, verify full builds and Playwright, verify hosted Supabase Realtime, test with a real microphone, and finish Twilio/WhatsApp, test-provider payments, deployment and submission assets.
**Publishing blocker:** The GitHub integration returned HTTP 403 for branch creation and blob uploads. A local patch is available against upstream main.

### 2026-11-23 18:05 IST · Free LLM (Groq) · Pranav via Claude Code · done (18:26 IST)
**Branch:** `llm-groq-free` (from `main` @ `5eaa7b4`) · **Commits:** see `git log main..llm-groq-free`
**Goal:** cut LLM cost and latency with Groq's free tier (key in `.env` as `LLM_API_KEY`; never committed).
**Done:** `LLM_MODEL` takes a comma list of models (`model@effort` = that model's `reasoning_effort`); `LLM_FALLBACK_*` adds another provider last; `FallbackLLM` tries them in order, skips a model for 30 s after a 429, and only the last one retries. `LLMReply.model` + `ctx.llm_models`: the eval prints steps by model. `.env`: Groq chain (qwen3.8-27b@none → gpt-oss-20b@low → gpt-oss-120b@low) → Featherless Qwen3-30B.
**Findings:** Groq free = 8K tokens/min and 1K requests/day **per model** (headers); our steps are ~2.7K tokens, so ~3 steps/min/model. Groq steps 0.48–0.69 s median vs Featherless 2.1 s (p90 6.6 s). gpt-oss sometimes returns HTTP 400 (native tool call / invalid JSON) → next model.
**Tests / checks:** `uv run pytest -q` → **316 passed** · ruff ✓ · mypy ✓ · eval slice 12/12 on the chain (36/59 steps still served by Featherless because the eval runs calls back-to-back).
**PR #5 review:** chain links before the last now give up after 3 s (a hung free-tier model could otherwise stack 4 × 4.5 s before the voice apology); `calls.latency_json.per_step_model` records which model answered. Smoke test 3/3, step median 0.7 s.
**Next steps:** voice test once Sarvam has credits; consider trimming history/tool results in the prompt to fit more steps in the free budget; Cerebras free tier as another chain member if a key is available.

### 2026-11-23 17:45 IST · Self-harm reply · Pranav via Claude Code · done (18:00 IST)
**Branch:** `self-harm-reply` (from `main` @ `3e50fd3`) · **Commits:** see `git log main..self-harm-reply`
**Goal:** a separate, gentle reply for self-harm / suicidal thoughts (approved by Pranav), instead of the 108/112 emergency line.
**Done:**
- Data schema (approved): `speciality_mapping.json` gains optional `self_harm_phrases` + `self_harm_reply` {te, hi, en}. Reply: sorry you feel this way, you're not alone, Tele-MANAS **14416** / **1-800-891-4416** (free, day and night), **112** if in danger now. Validator requires 14416 and 112 in every language.
- `import_data.py` moves suicide/self-harm phrases out of `emergency_phrases` (4 of Akshit's + 4 baseline) and merges 12 more baseline phrases → real data: 78 emergency + 33 self-harm. Re-import changed only `speciality_mapping.json`.
- Code: `find_self_harm` checked before emergencies in `map_speciality` (`{"emergency": true, "self_harm": true, "reply"}`) and as a session guard in **any** call (restaurant too), no LLM, no booking, call stays open; voice never drops it as stale; `ctx.self_harm` flag. Prompt rule 8 updated.
**PR #4 review:** self-harm matching was fuzzy like emergencies, so "booking karna chahta hoon" matched "marna chahta hoon" and "jana nahi chahta" matched "jeena nahi chahta" (ordinary callers would have got the helpline reply and lost their booking). Now exact whole-phrase only, plus STT spellings and the unambiguous words (suicide, aatmahatya, आत्महत्या, ఆత్మహత్య) → 33 self-harm phrases; regression tests. Noted, not changed: the emergency matcher has no negation ("accident nahi hua" still counts, hospital calls only).
**Tests / checks:** `uv run pytest -q` → **311 passed** · ruff ✓ · mypy ✓ · `validate_data.py` ✓ · text eval 40/40 (provider slow: LLM median 3.6 s, p95 21.7 s at 17:55).
**Needs from humans:** a native Telugu and Hindi speaker should read the reply text in `scripts/data_extras/speciality_base.json` / `data/speciality_mapping.json`; ask Akshit to add `self_harm_phrases` / `self_harm_reply` to the data prompt for future regenerations.
**Next steps:** Sarvam credits, Supabase DB password, then Phase 6 (Twilio) / Phase 5 integration.

### 2026-11-23 10:10 IST · Phase 4 · Pranav via Claude Code · done (17:40 IST)
**Branch:** `phase-4-voice` (from `main` @ `f60f5d0`) · **Commits:** see `git log main..phase-4-voice`
**Goal:** talk to Vaani by voice in the browser with the Phase 3 brain; measure latency and barge-in.
**Done:**
- Keys: `SARVAM_API_KEY` verified (text-lid 200); Supabase URL + secret/publishable keys saved to `.env` (REST OK, project empty). DB password still missing, so `SUPABASE_DB_URL` is empty and schema/seed are NOT applied to the hosted project yet.
- `pipecat-ai[sarvam,silero,webrtc,local-smart-turn]==1.16.0` (1.17.0 was a day old). APIs read from the installed source + Context7.
- `voice/stt.py` (Sarvam saaras, `translit` → romanised te/hi), `voice/tts.py` (Bulbul v3, voice `priya`, language switch frame), `voice/normalizer.py` (+51 tests), `voice/brain.py` (`VaaniBrain` + `AudioTap`), `voice/pipeline.py` (`run_call(transport, …)`), `voice/events.py`, `api/voice_routes.py` (`POST/PATCH /webrtc/offer`, `/voice/events/{pc_id}`, `/voice-test`), `static/voice_test.html`, `eval/voice_probe.py` (aiortc synthetic caller), `VAANI_DEV_DB=ephemeral` dev DB.
- Session hooks: listeners (also on ToolContext → `booking_created` reaches the page), `on_progress` interim lines, per-turn `voice_turns` + `barge_in_ms` in `calls.latency_json`, real `call_ended.duration_s`.
- Fixes found by voice runs (all tested): Sarvam's "chhah" (six); split turns → stale replies dropped; a second "yes" after booking no longer re-books (was SLOT_TAKEN → "slot full"); "Kavali N D" (STT for "kavali andi") no longer a name; slot checked before asking the name, nearest 2 times for doctors too; repeated doctor first names (two Dr. Suvins) — fuzzy surname + hospital/area/speciality, tie → ask (a run had booked the wrong Dr. Suvin); fuzzy business names ("Vana Grove"); Smart Turn wait capped at 1.5 s (a 3.2 s turn); first audio timed at the TTS output (a run logged a fake 15 s); booking IDs/helplines read digit by digit in English; voice LLM timeout 4.5 s × 1 retry + second filler + apology (provider stalls of 10–20 s); turn tasks cancelled at call end; STT "bantlaki" = gantalaki; an LLM that writes its own read-back is sent back once to call `propose_*`.
**Tests / checks:** `uv run pytest -q` → **301 passed** · ruff ✓ · mypy ✓ · text eval 40/40 after the changes (LLM p95 12.3 s in the evening vs 2.2 s in the morning). Voice (EVAL.md): 9/10 late calls booked correctly (the 10th fixed after), final code 4/4; turn total median 1.24 s server / 1.51 s caller; code-only turns 0.54 s; barge-in 236 ms median after VAD.
**Decisions:** kept the Phase 3 Session (custom Pipecat processor) instead of Pipecat Flows' FlowManager (guards + code read-backs + JSON-action LLM already 40/40; native tool calling failed on Featherless). Fillers at 0.6 s. English digits for IDs.
**Blockers / needs from humans:** **Sarvam credits ran out** (402 `insufficient_quota_error`) — voice (STT + TTS) stops until topped up; Supabase DB password (for `SUPABASE_DB_URL` + `scripts/db_apply.py`); approval of the self-harm data change; a real-mic try in Chrome at `/voice-test`.
**Next steps:**
1. With the DB password: `uv run python scripts/db_apply.py` on the hosted project, check RLS (anon can't read phone) and Realtime.
2. Try `/voice-test` with real voices in te/hi/en; note STT errors.
3. Self-harm reply (after approval). 4. Phase 6 (Twilio) reuses `run_call`.

### 2026-11-23 09:25 IST · Data import (before Phase 4) · Pranav via Claude Code · done (09:50 IST)
**Branch:** `data-real-import` (from `main` @ `cc42f64`) · **Commits:** see `git log main..data-real-import`
**Goal:** bring Akshit's real data (was only in `~/Downloads`) into `data/`, make it validate and seed, freeze the eval clock, re-run the eval honestly.
**Done:**
- `scripts/import_data.py <folder>`: shape-only conversion + validation (drops row-level `is_sample_data`, list-shaped `areas.json` with the shared unsupported-area reply copied in, lower-cased aliases, `mappings` → `phrases`, derived `slug` / `accent_color`, inferred test-call `scenario`, merges baseline phrases from `scripts/data_extras/speciality_base.json`). Real data: 1,240 load problems → 0 errors.
- Weekday rule relaxed (CONTRACTS §7, DATA_PROMPT): doctors work all 7 days, hours may differ per weekday; exceptions / expected times must be a slot on every weekday (`schedule.every_day_times`). Seeding already used the real weekday per date. All 1,115 real exception times fit.
- Short emergency forms were missing from the real list ("chest pain", "सीने में दर्द", "behosh" didn't trigger 112/108) → baseline phrase merge (166 speciality + 86 emergency phrases).
- Eval clock frozen at 09:00 IST: `clock.freeze()` + `vaani_now_ist()` / `vaani_today()` honour a per-DB `vaani.now_ist` setting (`devdb.freeze_db`); `--now`, `--real-clock`.
- Tests: placeholder set moved to `backend/tests/fixtures/placeholder_data/` (unit/DB tests seed from it in memory); new `test_real_data.py` (validation, weekday rule, demo scenarios, FAQ, every phrase maps, doctor-name check).
- Eval on real data, first run **32/40**. Fixes: Telugu party forms (naluguriki, mugguram, aaruguriki), "Change that to four", names before "peru meeda" / "ke naam se" / "under", "parson", FAQ topics (wheelchair, lab, fee, Sunday). **Safety:** a booking needs a yes word in the caller's own turn (T05 booked on a name); ₹ amounts the LLM states must come from a tool or the chosen business/doctor (it invented "fee 1000 / 900" for a ₹650 doctor); the doctor's own name can't become the caller's name.
- Prompt examples rewritten with real businesses/doctors; CALL_FLOW, DEMO (new demo-scenarios table), WEBSITES, FRONTEND_PROMPT examples moved off "Spice Garden".
**Tests / checks:** `uv run pytest -q` → **231 passed** · ruff ✓ · mypy ✓ · eval (Featherless Qwen3-30B-A3B-Instruct-2507): 32/40 → 40/40 on 6 consecutive runs, LLM median ≈ 1.5 s, p95 ≈ 2.0–2.3 s, ≈ $0.05 per run.
**PR #3 review (17:50 IST):** cap on concurrent browser calls (`MAX_WEB_CALLS`, 503 `BUSY`) so a public page can't burn the credits; call-failure logging no longer raises on cancelled tasks; `PATCH /webrtc/offer` without `pc_id` → 400; typed web-call phone numbers noted in LIMITS (verify before Phase 6 WhatsApp).
**PR review (10:00 IST):** the amount guard counted every number in the timeline (an `ms: 900` would "verify" a ₹900 fee) → only money fields + ₹ in text; the new yes check rejected "Go ahead" / "Kar do" while the plain-yes path accepted them → one shared `_affirmative()`; "Rs 500" now caught. Eval after review: 40/40.
**Decisions:** keep the contract's file shapes and convert on import (no schema change). Merged our earlier tested phrase list into the teammate's mapping rather than trusting long-sentence emergency phrases alone.
**Corrections to the handoff brief:** Pulao Pankthi tomorrow night is full for 3+ people, not for everyone (one 2-seater left; T16 books it). The real data has no blocked slots and no doctor on leave (validator warnings).
**Blockers / needs from humans:** `SARVAM_API_KEY` (Phase 4); a Supabase DB (hosted URL/keys, or local `supabase start`); approval for the self-harm data change (`self_harm_phrases` + `self_harm_reply`); where Karthik/Akshit's frontend lives.
**Next steps:**
1. Review + merge `data-real-import` → `main`.
2. Self-harm reply (after approval): separate gentle reply with Tele-MANAS 14416 / 1-800-891-4416, 112 for immediate danger.
3. Phase 4 plan (voice over browser).
4. Optional: 10–20 unseen test calls for a held-out number.

### 2026-11-22 20:26 IST · Phase 3 · Pranav via Claude Code · done (finished 20:53 IST)
**Branch:** `phase-3-text-agent` (from `main` @ `2e43029`) · **Commits:** `42eee82`, merged via PR #1
**Goal:** text-mode agent (router + restaurant + hospital), CLI, eval on the 40 test calls.
**Done:**
- Fixed `parse_time` (clock times on raw text; last "<n> ki/baje" wins; nearest part-of-day cue, because "Udayam" clinic means "morning" in Telugu); added `latest_time` / `latest_day` for corrections ("4:30… ledu, 5:30").
- `backend/flows/context.py` (CallContext + CONTRACTS §5 outcome JSON), `nodes.py` (router / restaurant / hospital nodes in Pipecat Flows shape, 13 functions + 4 globals), `session.py` (turn runner), `extract.py` (party size incl. "naluguru"/"tommidi mandi", names, named businesses/doctors), `speech.py` (code-written read-backs, spoken times), `prompts/` (rules + te/hi/en style + 18 example dialogues), `cli.py`.
- `backend/eval/eval.py` + `scoring.py`: one cloned throwaway DB per call, metrics by language, JSON results in `backend/eval/results/` (git-ignored).
- `find_emergency` / `find_speciality_phrase` extracted in `tools/hospitals.py` so the guards and the tools share one matcher.
**Files:** see the commit; tests `test_flows_parsers.py`, `test_flows_session.py`, `test_eval_scoring.py` (new).
**Tests / checks:** `uv run pytest -q` → **195 passed** · ruff ✓ · mypy ✓. Eval (Featherless Qwen3-30B-A3B-Instruct-2507, JSON protocol): first run 23/40; after fixes **40/40 on three consecutive runs** (booking accuracy 28/28, top-3 22/24, unsupported 4/4, emergency 3/3, FAQ 4/4, slot-full→nearest 2/3); LLM median ≈ 1.6 s, p95 ≈ 2.7 s; ≈ $0.05–0.06 per full run.
**Decisions (why the numbers went from 23 to 40):** the small fast LLM misread facts, so **code reads them**: party size, names, named places, day/time from the caller's words beat the LLM's arguments; deterministic guards (emergency, unsupported area, FAQ, OTP redaction) run before the LLM; read-backs are written by code (the LLM once read back 8:30 while booking 19:30); a plain "yes" confirms in code; if all details are known, code proposes. The LLM may not invent a caller's name. Real bugs found and fixed on the way: knee-pain-as-emergency (Phase 2), OTP digits stored before redaction, a cut-off JSON reply spoken aloud, "Aapka naam" used as a name.
**Caveat:** 40/40 is on the placeholder data the agent was tuned on. It proves the pipeline end to end, not held-out accuracy (written in EVAL.md and LIMITS.md).
**Blockers / needs:** none. Local Supabase check still open (Docker).
**Next steps:**
1. Review + merge PR `phase-3-text-agent` → `main`.
2. Phase 4 (voice): follow the updated Phase 4 prompt in `docs/PHASE_PROMPTS.md` (wrap `Session.handle` in a Pipecat processor first; measure latency); needs `SARVAM_API_KEY`.
3. When the real data lands: validate, `make_seed_sql.py`, re-run the eval and update EVAL.md honestly.
4. Optional: write 10–20 *new* test calls nobody tuned on, for a held-out number.

### 2026-11-22 13:04 IST · Phase 3 · Pranav via Claude Code · handed off
**Branch:** `main` · **Commits:** the commit that adds this entry
**Goal:** text-mode agent (router + restaurant + hospital flows), CLI and `eval.py`.
**Done (WIP, unit-checked by hand but no tests yet):**
- `backend/voice/llm.py`: OpenAI-compatible adapter using a **JSON action protocol**. The model replies with one object `{"say": "...", "actions": [{"tool": "...", "args": {...}}]}`; tolerant parser `parse_reply`; `OpenAICompatLLM` (retries 5xx/429, `response_format=json_object`); `ScriptedLLM` test double; `from_env()`.
- `backend/flows/language.py`: `detect_language(text) -> (te|hi|en, confidence)` from script + romanised function words.
- `backend/flows/when.py`: `parse_day(text, today)` (aaj/kal/parso, ivala/repu/ellundi, "3 din baad", "naalugu rojula tarvata", weekdays in en/hi/te, ISO) and `parse_time(text, kind)` ("saadhe aath", "enimidinnara", "okati gantaki", "raat 9 baje", "7:30 pm"; ambiguous hours resolved per restaurant/hospital hours).
- `backend/devdb.py`: throwaway Postgres cluster + seeded **template database** + `clone()` for one fresh DB per eval call (no Docker needed).
- `backend/config.py`: `llm_base_url`, `llm_model`, `llm_api_key` settings. `openai` dependency added.
**Known bug to fix first:** `parse_time` returns `None` for plain clock times: `"8:30"`, `"10:15"`, `"7:30 pm"`, `"saayantram 4:30"`, `"12 noon"`. Cause: `norm()` turns `:` into a space before the `HH:MM` regex runs. Parse times on the raw lower-cased text, not `norm()`'s output, then add unit tests for every case in the Phase 3 prompt.
**LLM findings (Featherless, request-pricing plan, ~$20 credit, concurrency 100):**
- Key lives only in `.env` as `LLM_API_KEY` (git-ignored). Never commit it. `LLM_BASE_URL=https://api.featherless.ai/v1`, `LLM_MODEL=Qwen/Qwen3-30B-A3B-Instruct-2507`.
- **Native tool calling is broken there today**: Qwen3-30B-A3B-Instruct-2507 and Qwen3-14B return HTTP 500 when `tools` is sent; Qwen3-32B ignored the tool, took 19 s and invented restaurants; Qwen3-8B was at capacity. Hence the JSON protocol above.
- JSON mode on Qwen3-30B-A3B-Instruct-2507: valid JSON 3/3, ~1.0–1.6 s warm (3.7 s cold), ~180 prompt tokens for a tiny prompt. Price ≈ $0.125 / 1M input, $0.45 / 1M output, so a full eval run should cost well under $1.
**Tests / checks:** `uv run pytest -q` → 131 passed (no new tests yet) · ruff ✓ · mypy ✓.
**Decisions:** own runner that mirrors Pipecat Flows (`NodeConfig`-like nodes with role/task messages and functions whose handlers return `(result, next_node)`), so Phase 4 wraps the same nodes in a Pipecat `FlowManager` instead of rewriting them. Deterministic guards before the LLM: emergency → 108/112 without calling the LLM, OTP/card mention → refusal line, booking only via `propose_booking` (read-back) then `confirm_booking` on a later turn.
**Blockers / needs:** none for Phase 3 (LLM key present). Local Supabase still unverified (Docker).
**Next steps:** follow "Phase 3" in `docs/PHASE_PROMPTS.md`. It lists the remaining steps in order: fix `parse_time`, context + nodes + guards + session runner, prompts per language, CLI, eval, tests, docs.

### 2026-11-22 12:54 IST · Phase 2 · Pranav via Claude Code · done
**Branch:** `main` · **Commits:** `7343662`, `0771d00`
**Done:** all 14 tools (`backend/tools/`, one runner `run_tool` with Pydantic args, coded errors, tool timeline, `tool_called` events); FastAPI app (`backend/api/`): businesses, slots, booking status, partner bookings with derived passcodes, PATCH status, slot blocks, doctor leave, HMAC-signed payment webhook, mock pay, dev simulate-booking; async psycopg pool (`backend/store.py`); mock messenger with the WhatsApp card; `scripts/partner_passcodes.py`. Added `docs/FRONTEND_PROMPT.md` plus a frontend ↔ backend differences table in `docs/WEBSITES.md`.
**Tests / checks:** 131 passed (83 new) · ruff ✓ · mypy ✓ · uvicorn smoke boot ✓ (health + simulated booking produced the WhatsApp card).
**Decisions:** backend talks to Postgres directly (`SUPABASE_DB_URL`) for latency + transactions; catalogue text from `data/`, live state from the DB; fuzzy emergency matching uses same-length word windows (fixed "घुटने में दर्द" knee pain matching chest pain).

### 2026-11-22 12:38 IST · Phase 1 · Pranav via Claude Code · done
**Branch:** `main` · **Commits:** `9a2f0b8`
**Done:** `supabase/schema.sql` (tables, partial unique indexes, atomic `book_table` / `book_appointment` / `cancel_booking`, `vaani_today()`), `supabase/rls.sql` (anon read-only, phone columns hidden via column grants, Realtime publication), placeholder data (9 files), `backend/catalog/` (models, loader, validation, schedules, evergreen seed SQL), scripts `validate_data.py`, `make_seed_sql.py`, `seed.py`, `db_apply.py`, `supabase/config.toml`.
**Tests / checks:** 48 passed incl. two 20-caller races (exactly 1 booking each).
**Blockers:** Docker Desktop VM wouldn't start, so RLS/Realtime are not yet verified on local Supabase (`supabase start` → `db_apply.py`).

### 2026-11-22 12:15 IST · Phase 0 · Pranav via Claude Code · done
**Commits:** `d33536a` — repo skeleton, all docs, CLAUDE.md, README, LICENSE, ATTRIBUTIONS, AI_USAGE, EVAL skeleton, `.env.example`, compose skeleton.
