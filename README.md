# The Floating Lantern Heist

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/xclouds8/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/xclouds8/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

A top-down stealth heist on a night bazaar floating on stilts over dark
water. You are a lantern-carrying thief: slip past three watchmen and two
brass lantern-cameras, steal the Golden Koi from its shrine, and reach the
escape boat before dawn.

## Dossier

**The game.** One floating bazaar at night, seen from above. Three guards
(Old Bao, Sister Mei, Captain Rook) patrol fixed routes with wide amber
vision cones; market stalls block their sight and your movement, so every
room has three routes — the open centre lane, the west stalls, the east
stalls. Two brass lantern-cameras sweep red cones across the deck. Standing
in a cone fills the alarm meter; break line of sight and it drains again.
Past 40 the guards grow suspicious and close in on the last place they saw
you; at 100 the alarm sounds and they chase — get touched and you are
caught. Grab the Golden Koi (a one-second lift from its shrine), then run
for the boat. Five jade caches and scattered coins reward the bold: coins
buy a smoke lantern (Q) that hides you, or a firecracker (E) that pulls a
guard away to investigate. A night timer counts down to dawn.

**The look.** Deep teal water with drifting lantern reflections, warm amber
lantern light, plank decks, striped market stalls, jade loot and a glowing
gold Koi. Safe cover is warm wood, danger is amber and red, loot is gold
and jade — a screenshot sells the game in one second. The thief carries a
soft lantern glow, the signature light of the heist.

**How to play.** WASD or arrow keys to move, or click anywhere to walk
there. Hold Shift to sneak (slower, harder to spot). Space dashes. Q drops
a smoke lantern (25 coins), E throws a firecracker (15 coins). P pauses,
M mutes, R restarts after being caught, winning, or at dawn. Three
difficulties on the title screen: Paper Lantern, Festival Night, Typhoon
Watch (keys 1/2/3 or click). A minimap, the alarm meter, the score, the
jade count and the countdown to dawn are always on screen. Synthesised
WebAudio sounds throughout — no audio files, no network requests, everything
drawn and sounded in code.

**The build.** `game/` is plain static files: `index.html` plus nine ES
modules under `game/src/`, each with one clear job (config, random, audio,
level, world, input, render, shots, main). `main.ts` (Node 22, standard
library only) copies `game/` and `screenshots/` to `/output` and writes
`dossier.json` with the kit's vendored `vendor/makefun-game.ts`. Run it with
`mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`; serve the game with
`node serve.ts` and play at http://localhost:8080.

## Screenshots

- `1-cover.jpg` — mid-heist: the thief between the stalls, guards and
  their amber cones, a sweeping lantern-camera, the Golden Koi shrine and
  the alarm meter, all in one frame.
- `2-patrol.jpg` — the calm before: guards on patrol, cones sweeping, the
  bazaar at rest.
- `3-alarm.jpg` — the alarm nearly full: a watchman closing in, red at the
  edges of the screen.
- `4-win.jpg` — the getaway: the Koi stolen, the boat waiting, the night won.
