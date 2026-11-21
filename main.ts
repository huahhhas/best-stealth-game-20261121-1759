// DOCKLIGHT — the hand-in program (Node 22, standard library only).
// It gathers the entry's pieces — the game under game/, the screenshots
// under screenshots/ — into the output directory and asks the vendored
// make.fun library to write the dossier the judge reads. Nothing here
// depends on the clock or on chance, so two runs write the same bytes.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(outputDir, 'game');
const shotsDir = join(outputDir, 'screenshots');
const dossierPath = join(outputDir, 'dossier.json');

// Clear the previous run's output first, so a re-run can never carry
// stale files forward and the two runs stay byte-identical.
mkdirSync(outputDir, { recursive: true });
rmSync(gameDir, { recursive: true, force: true });
rmSync(shotsDir, { recursive: true, force: true });
rmSync(dossierPath, { force: true });

cpSync(join(repoRoot, 'game'), gameDir, { recursive: true });
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), shotsDir, { recursive: true });
}

// The scorer's own caps, as the kit documents them: the dossier text is
// capped at 160 KiB, at most 4 screenshots of at most 256 KiB each, and
// game/ holds at most 993 files and directories and 48 MiB in all.
const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(dossierPath, dossierBytes);

// A one-line summary for the operator: the grader reads the files, not
// this, but a human running the hand-in locally wants to see it land.
console.log(
  `DOCKLIGHT handed in: game/ + ${dossierBytes.length} bytes of dossier -> ${outputDir}`,
);
