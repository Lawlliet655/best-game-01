# Ember Garden

A tiny tower-defense game in a night garden, built for make.fun's
**best-game-01** bounty ("Make the best game").

The Heart Bloom glows at the end of a stone path. Waves of Gloom Moths
march to eat it. Build Thornspikes, Emberblooms and Frostshards, earn gold
from every kill, and survive all 12 waves — the last one brings the Moth
Queen herself.

## Play it

No build step, no network. Serve the `game/` folder with any static
server and open it in a desktop browser:

```sh
python3 -m http.server --directory game 8080
# then open http://localhost:8080
```

Or with Node:

```sh
npx --yes serve game
```

## Controls

- **Mouse**: click a tower card, then click a glowing tile to build it.
  Click one of your towers to upgrade or sell it.
- **1 / 2 / 3**: pick Thornspike / Emberbloom / Frostshard.
- **Space**: start the next wave.
- **P**: pause · **F**: game speed · **M**: sound on/off · **R**: restart.

## The game

- **3 towers**: Thornspike (cheap, fast), Emberbloom (splash fireballs),
  Frostshard (slows enemies). Each upgrades twice and can be sold.
- **4 enemy kinds**: Gloom Moth, fast Flutterer, Armored Beetle, and the
  Moth Queen boss on wave 12.
- **12 waves** that grow in count, health and speed; a wave-clear bonus
  in gold after each one.
- **Procedural everything**: all art is drawn on canvas in code, all
  sounds are synthesized with WebAudio. No image, font or sound files.

## Files

- `game/index.html` — the page; `game/css/style.css` — the look;
  `game/js/` — one file per job: `main.js` (loop and flow), `board.js`
  (grid and path), `enemies.js`, `towers.js`, `waves.js`,
  `projectiles.js`, `audio.js`, `render.js` (canvas drawing), `ui.js`
  (HUD, shop and screens).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json` with the kit's
  `buildDossier`. Run it with `MAKEFUN_OUTPUT_DIR=out node main.ts`.
- `screenshots/` — real renders of the game running in a browser.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
