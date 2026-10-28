# Night City Syndicate

A cyberpunk crime syndicate idle/management browser game. Start as a solo hustler with 100 eddies and a rusty pistol, and claw your way up to a cartel running drug labs and territory across Night City.

**Single self-contained HTML file. No build step, no dependencies, no external assets.**

## Play

Open `index.html` in any browser:

```bash
chromium index.html
```

Or copy it to a Raspberry Pi 4 and open it there. To run it as an always-on idle machine (kiosk mode, boots straight into the game):

```bash
chromium --kiosk --app=file:///home/pi/nightcity/index.html
```

Add that line to `~/.config/lxsession/LXDE-pi/autostart` to launch on boot.

## Features

- **Core loop**: commit crimes (pickpocket → mugging → robbery → heist → net heist), earn eddies, recruit crew, buy gear. Floating `+N ¢` on every score.
- **Gang identity**: name your gang, pick one of 12 procedurally-drawn neon emblems and a signature color. Shows in the HUD, member cards, event popups, and territory map.
- **Progression ladder** (5 tiers): Solo Hustler → Small Crew (3) → Established Gang (10) → Syndicate (30) → Cartel (80). Each tier jump fires a narrative banner + city visual upgrade.
- **Shop** (13 items): Crew (repeatable ×1.215), Gear (6 items, repeatable ×1.30), Operations (4 fronts + 2 drug labs, one-time income multipliers).
- **Heat system**: crimes add heat (a little slower than before); above 20% the corrupt CPD taxes every score; above 75% jobs fail more often. Heat decays over time, or pay bribes to clear it.
- **Auto-crew jobs**: assign crew to crimes to run them automatically. More crew on a job means more pay per score (+15% each), but bigger crews draw more fire when things go wrong. Flatlined soldiers are injured — out of action for at least 1 hour (longer at high heat) and back on passive duty once recovered.
- **JOBS tab**: auto-crime results stream into a dedicated tab on the right, rendered only while you're watching it — zero visual load otherwise.
- **Rival gangs**: 3 AI rivals (Maelstrom, Voodoo Boys, Sixth Street) contest your districts in the background. Fully non-blocking — results arrive as dismissible toasts + a scrolling event log.
- **Territory map**: 6 Night City districts. Hold one for a passive bonus (+10% income, +8% success, −15% heat gain, +15% payout, ×1.5 mult, ×1.25 lab mult). Assign guards to defend; attack rival districts to claim them.
- **Prestige**: "Vanish and rebuild with a new identity" at 5B ¢ net worth — resets your empire for a permanent Street Legend ×1.5 income multiplier that stacks.
- **Offline "laying low"**: award passive income at 30% of active rate (capped at 8h). No heat earned while away; heat decays 3× faster. Districts can still be lost to rival attacks or NCPD busts, resolved against your guards. The "While you were gone…" summary reports eddies earned, heat cleared, and districts lost or held.
- **Save management**: autosave to localStorage + Export/Import save as JSON files (Stats tab). Reset button behind double-confirm.

## Target platform

Optimized for **Raspberry Pi 4 / Chromium**:
- Static skyline pre-rendered to an offscreen canvas; only lit-window/neon deltas drawn per frame
- Scanlines via static CSS gradient; rain via a single lightweight canvas layer
- Particles capped at 150; floaters capped at 25
- No per-frame full-screen blur/filter effects
- Smooth 60fps on desktop, steady 30fps minimum on Pi 4

## Balance

Reaching the **Syndicate** tier takes ~30–45 minutes of engaged play (simulated: ~35 min). The Cartel tier is multi-hour endgame.

The balance constants are the result of 39 Monte Carlo economy sweeps (see `balance/`). The authoritative locked config is in `balance/sweep39.js`; `balance/balance_check.js` drives the real game code as a simulated engaged player and reports tier timings.

## Development

### Run the test suite

Requires Node.js (no browser needed — tests stub the DOM/canvas):

```bash
sh tests/run_all.sh
```

This extracts the inline JS from `index.html`, syntax-checks it, and runs 8 headless test harnesses covering: core economy, frame loop, gang identity, save management, rivals, districts, offline mode, and full integration.

### Run a balance check

```bash
node tests/extract.js   # if you haven't already
node balance/balance_check.js
```

### Run the balance sweeps

```bash
node balance/sweep39.js   # final locked config
node balance/sweep36.js   # earlier variant
```

### Project layout

```
index.html              ← the game (single self-contained file, the deliverable)
tests/                  ← headless test harnesses (run with sh tests/run_all.sh)
  extract.js            ← extracts inline JS from index.html
  run_all.sh            ← runs the full suite
balance/                ← Monte Carlo economy simulation harnesses
  sweep36-39.js         ← parameter sweeps that produced the locked balance
  balance_check.js      ← drives the real game code, reports tier timings
  sim.js, balance_final.js  ← earlier sim versions
```

## Save compatibility

Saves from older versions load cleanly. Missing fields are initialized with defaults:
- No `gang` → one-time gang naming screen on next load
- No `districts` / `rivals` / `eventLog` → initialized fresh
- Older economy values are preserved as-is
