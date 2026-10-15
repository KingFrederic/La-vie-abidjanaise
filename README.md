# La-vie-abidjanaise

A French-first, browser-playable day-in-the-city narrative set in Abidjan. Make choices across Yopougon, Adjamé, the Plateau, Abobo-Doumé and Treichville; balance your budget and energy; and decide what matters when the day’s plan meets the city’s pace.

## Run locally

This is a dependency-free static web app. From the repository root:

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Open `http://localhost:4173` in a browser. The game works on mobile and desktop.

## What’s in the prototype

- A one-day narrative loop with branching choices, weather variation, route trade-offs and a noon delivery objective.
- Abidjan-specific places, transport modes, meals and everyday social choices, with a small glossary.
- A schematic route map, resource tracking and a local journal.
- Progress is saved in this browser only; there is no account, credential field or backend. Transport prices and travel times are **fictional game values**, not real fares or schedules.

The original REA source investigation is in [docs/lagoslife-rea-investigation.md](docs/lagoslife-rea-investigation.md). That report explains why the public repository previously found under a matching Lagos Life name was not a reliable source for the live game.
