// main.ts — Ember Garden's entry program for make.fun's best-game-01.
// It copies the game's static files and the screenshots into the output
// directory and writes the dossier buildDossier builds from them.
// Node 22 standard library only; no install, no network, no build step.
//
// In the grader the output directory is /output and the repository is the
// read-only /bot. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for
// /output (for example: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts).
// The program runs twice and both runs must write the same bytes: copying
// files and building the dossier are both deterministic, so they do.

import { buildDossier } from './vendor/makefun-game.ts';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));

/** The output directory: MAKEFUN_OUTPUT_DIR when set, else /output. */
function outputDir(): string {
  const given = process.env.MAKEFUN_OUTPUT_DIR;
  if (given === undefined || given === '') return '/output';
  return resolve(process.cwd(), given);
}

/** Copy one directory tree (files only, no symlinks) into the output. */
function copyTree(from: string, to: string): number {
  if (!existsSync(from)) return 0;
  cpSync(from, to, { recursive: true, dereference: false });
  let count = 0;
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else count++;
    }
  };
  walk(to);
  return count;
}

function main(): void {
  const out = outputDir();
  // Start from a clean output directory so a second run writes the same
  // bytes as the first (the grader runs this program twice). The output
  // directory itself must NEVER be removed: in the grader /output is a
  // mount point whose parent filesystem is read-only, so rmSync on it
  // fails with EACCES and the whole run fails before it writes anything.
  // Only its contents are cleared, never the directory itself.
  mkdirSync(out, { recursive: true });
  for (const entry of readdirSync(out)) {
    rmSync(join(out, entry), { recursive: true, force: true });
  }

  const gameFiles = copyTree(join(REPO_ROOT, 'game'), join(out, 'game'));
  const shotFiles = copyTree(join(REPO_ROOT, 'screenshots'), join(out, 'screenshots'));

  const dossier = buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(out, 'dossier.json'), dossier);

  console.log(`Ember Garden: ${gameFiles} game files, ${shotFiles} screenshots -> ${out}`);
  console.log(`dossier.json: ${dossier.length} bytes`);
}

main();
