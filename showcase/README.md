# Vaani showcase

A standalone, single-page showcase for **Vaani**, an AI phone receptionist for restaurant table bookings and hospital or doctor appointments.

The visual concept is **“a voice becomes a booking”**: a living voice motif, a scroll-led journey through the call, spoken examples in three languages, and an interactive visual call simulation.

## Run locally

Requires Node.js 20.19+ (or 22.12+).

```powershell
cd showcase
npm.cmd ci
npm.cmd run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`).

## Production build

```powershell
npm.cmd run build
npm.cmd run preview
```

The production output is written to `dist/`.

## Browser call

**Talk to Vaani** opens the existing browser voice console. For local testing,
start the FastAPI server on port 8000 from the repository root with
`uv run uvicorn backend.api.app:app --host 127.0.0.1 --port 8000`. The backend
needs a seeded Postgres database, configured speech and LLM providers, and
available provider credits. See the root `.env.example` for backend settings.

For a hosted showcase, serve the voice console at `/voice-test` on the same
origin or set `VITE_VAANI_VOICE_URL` to the full HTTPS voice-console URL before
building. This setting is public. After opening the console, select **Call Vaani**
and allow microphone access. The **Try an example call** link opens the scripted
showcase demo.

## Notes

- The calls, availability, phone numbers, and confirmations in the page are clearly labeled examples.
- The interactive example is visual only. Live calls start in the voice console.
- Motion, horizontal scrolling, and the autoplay demo are adapted for `prefers-reduced-motion` and smaller screens.
- All visual assets in this project are original CSS/SVG artwork created for this showcase.
