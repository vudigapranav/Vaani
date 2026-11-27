# Vaani showcase

A standalone, single-page showcase for **Vaani**, an AI phone receptionist for restaurant table bookings and hospital or doctor appointments.

The visual concept is **“a voice becomes a booking”**: a living voice motif, a scroll-led journey through the call, spoken examples in three languages, and an interactive visual call simulation.

## Run locally

Requires Node.js 20.19+ (or 22.12+).

```powershell
cd vaani-showcase
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`).

## Production build

```powershell
npm run build
npm run preview
```

The production output is written to `dist/`.

## Notes

- The calls, availability, phone numbers, and confirmations in the page are clearly labeled examples.
- The interactive demo is visual only; it does not place a call or create a booking.
- Motion, horizontal scrolling, and the autoplay demo are adapted for `prefers-reduced-motion` and smaller screens.
- All visual assets in this project are original CSS/SVG artwork created for this showcase.
