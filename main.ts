// The Floating Lantern Heist — a make.fun best-heist-game entry (Node 22,
// standard library only). The game is this directory's game/ folder: plain
// static files a desktop browser loads offline (game/index.html and its ES
// modules, no library and no network request). This program hands it in: it
// copies game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun
// library. It writes the same bytes on every run, so the grader's two runs
// agree.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/**
 * The gate refuses more than 4 screenshots or any one over 256 KiB, so check
 * the bundle before handing it over and fail loudly here, with the exact
 * problem, instead of letting the grader refuse it silently.
 */
function checkScreenshots() {
  const dir = join(here, 'screenshots');
  if (!existsSync(dir)) throw new Error('screenshots/ is missing: take 3 or 4 real renders first');
  const names = readdirSync(dir).filter((name) => !name.startsWith('.')).sort();
  if (names.length < 3 || names.length > 4) {
    throw new Error(`screenshots/ holds ${names.length} images, the gate wants 3 or 4`);
  }
  for (const name of names) {
    const size = statSync(join(dir, name)).size;
    if (size > 262144) throw new Error(`screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
  }
}

checkScreenshots();

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files, in all, or a path under game/ over 1000 bytes: game/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
