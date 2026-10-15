# La-vie-abidjanaise

A French-first, browser-playable day-in-the-city narrative set in Abidjan. Make choices across Yopougon, Adjamé, the Plateau, Abobo-Doumé and Treichville; balance your budget and energy; and decide what matters when the day’s plan meets the city’s pace.

## Run locally

This is a dependency-free static web app. Everything the browser loads lives in `public/`. From the repository root:

```bash
python3 -m http.server 4173 --bind 0.0.0.0 --directory public
```

Open `http://localhost:4173` in a browser. The game works on mobile and desktop.

## Deploy (Vercel)

`public/` is the site root: Vercel serves it as-is, with no install or build step. `vercel.json` pins these settings (Framework Preset “Other”, Output Directory `public`) so they apply whatever the project dashboard says. Keep the project’s Root Directory set to the repository root so `vercel.json` is read.

Put every new page, script, style or image inside `public/`. Files outside it, such as `README.md` and `docs/`, are not deployed.

## What’s in the prototype

- A one-day narrative loop with branching choices, weather variation, route trade-offs and a noon delivery objective.
- Abidjan-specific places, transport modes, meals and everyday social choices, with a small glossary.
- A schematic route map, resource tracking and a local journal.
- Progress is saved in this browser only; there is no account, credential field or backend. Transport prices and travel times are **fictional game values**, not real fares or schedules.

The original REA source investigation is in [docs/lagoslife-rea-investigation.md](docs/lagoslife-rea-investigation.md). That report explains why the public repository previously found under a matching Lagos Life name was not a reliable source for the live game.
