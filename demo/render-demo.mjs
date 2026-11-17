// Renders the mod's own panel rows and band from a real Jev pick, without loading the engine.
//
//   node demo/render-demo.mjs <picks.json> <out.html>
//   node demo/render-demo.mjs --fixture jev
//
// Bundles hooks/register.tsx with a stub 'claude-code' module and the drawing functions exported,
// then draws a sample flow: the picks become planned tasks, the first three get runs.
// `--fixture jev` draws a fixed flow with Jev tasks running and done, writes demo/out/jev-panel.html
// and demo/out/jev-costumes.html, prints a JSON check and exits 1 if any check fails.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const isFixture = args[0] === '--fixture';
if (isFixture && (args[1] !== 'jev' || args.length !== 2)) {
  console.error('usage: node demo/render-demo.mjs --fixture jev');
  process.exit(2);
}
const ids = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5', fable: 'claude-fable-5-2', jev: 'jev-1.13.0', jev_image: 'jev-1.13.0' };
const MIX = ['haiku', 'sonnet', 'opus', 'fable', 'jev', 'jev_image'];

const head = title => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>:root{--bg:#f6f5f2;--card:#fff;--ink:#1f1f1f;--mut:#6b6b68;--line:#e4e4e1}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#151513;--card:#1e1e1b;--ink:#ececec;--mut:#a8a8a4;--line:#333331}}
:root[data-theme="dark"]{--bg:#151513;--card:#1e1e1b;--ink:#ececec;--mut:#a8a8a4;--line:#333331}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,'Segoe UI',sans-serif}.wrap{max-width:1000px;margin:0 auto;padding:24px 16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;margin:14px 0;overflow-x:auto}.mut{color:var(--mut)}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line)}svg{display:block;max-width:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}.cell{text-align:center}.cell svg{margin:0 auto}
.sec{font-size:12px;color:var(--mut);margin:8px 0 2px}</style></head>`;

const work = mkdtempSync(join(tmpdir(), 'sennable-demo-'));
let code = 0;
try {
  // paneSections is exported by register.tsx itself; only the rest is added here.
  const src = readFileSync(join(here, '..', 'hooks', 'register.tsx'), 'utf8')
    + '\nexport { agentSvg, plannedSvg, rowSvg, slimSvg, headerSvg, totals, cleanTasks, compactSvg, jevRunsOf, bandCrab, crab, CRAB_CSS, PANE_CSS }\n';
  writeFileSync(join(work, 'register.tsx'), src);
  writeFileSync(join(work, 'claude-code.mjs'), 'export const atom = (k, v) => k; export const read = async () => null; export const update = async () => null;\n');
  execFileSync(process.execPath, [join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js'), '-y', 'esbuild@0.24.0',
    join(work, 'register.tsx'), '--bundle', '--format=esm', '--platform=node', '--jsx-factory=h', '--jsx-fragment=Fragment',
    `--alias:claude-code=${join(work, 'claude-code.mjs')}`, `--outfile=${join(work, 'out.mjs')}`], { stdio: 'inherit' });
  globalThis.h = () => null;
  globalThis.Fragment = null;
  const m = await import(pathToFileURL(join(work, 'out.mjs')).href);
  const at = 1_000_000_000;
  const W = 560;

  if (isFixture) code = fixtureJev(m, at, W);
  else oldDemo(m, at, W, args[0], args[1]);
} finally {
  rmSync(work, { recursive: true, force: true });
}
process.exit(code);

function oldDemo(m, at, W, picksPath, outPath) {
  const picks = JSON.parse(readFileSync(picksPath, 'utf8'));
  // Picks come in two shapes: sure/guess keyed by `model` (older) or by `kind` (newer).
  const tasks = m.cleanTasks(picks.map((p, i) => {
    const fallback = (p.fallback ?? []).map(a => (a === 'kind' ? 'model' : a));
    const isJev = p.model === 'jev' || p.model === 'jev_image';
    return {
      title: p.title, model: p.model, effort: p.effort, skill: p.skill,
      sure: p.sure?.kind ?? p.sure?.model, fallback,
      guess: fallback.includes('model') ? (p.guess?.kind ?? p.guess?.model) : undefined,
      after: i === 3 ? [1] : [],
      state: p.state, label: p.label ?? (isJev ? p.model_name : undefined),
    };
  }));
  const flow = { title: 'Login + tests sweep', total: tasks.length, done: 1, running: 2, phase: 'delegate', isFinished: false, tasks };
  const run = (t, i, status, extra) => ({
    id: `r${i}`, agentId: `a${i}`, type: 'sennable-worker', description: t.title, model: ids[t.model], effort: t.effort,
    status, startedAt: at - extra.age, endedAt: status === 'done' ? at - extra.age + 41_000 : undefined,
    contextTokens: extra.ctx, contextMax: 1_000_000, tokens: extra.ctx * 1.6, costUsd: extra.cost, steps: 4, round: 1,
    stepDone: extra.done, stepTotal: extra.total, stepNote: extra.note,
  });
  const runs = [
    run(tasks[0], 0, 'done', { age: 260_000, ctx: 21_000, cost: 0.01, done: 3, total: 3 }),
    run(tasks[1], 1, 'running', { age: 130_000, ctx: 64_000, cost: 0.19, done: 3, total: 5, note: 'edge cases' }),
    run(tasks[2], 2, 'running', { age: 182_000, ctx: 140_000, cost: 0.88, done: 1, total: 6, note: 'reproducing' }),
  ];
  const planned = tasks.slice(3).map((t, k) => ({ ...t, n: k + 4 }));
  const mix = MIX.map(x => [x, tasks.filter(t => t.model === x).length]).filter(([, n]) => n);
  const band = m.rowSvg(flow, 960, true, { mix, mainLeft: 56 * 60_000, workerLeft: 8 * 60_000 + 12_000 });
  const rows = [
    m.headerSvg(W, flow.title, m.totals(runs, at)),
    ...runs.slice(1).map(a => m.agentSvg(W, a, at, flow)),
    m.agentSvg(W, runs[0], at, flow),
    ...planned.map(p => m.plannedSvg(W, p)),
  ];
  const guessOf = (p, a) => (p.guess ?? {})[a];
  const table = picks.map(p => `<tr><td>${p.title}</td><td>${p.model} · ${p.effort}</td><td>${p.skill}</td><td>${Object.entries(p.sure ?? {}).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(', ')}</td><td>${(p.fallback ?? []).length ? p.fallback.map(a => `${a} (Jev guessed ${guessOf(p, a)})`).join(', ') : '—'}</td></tr>`).join('');
  writeFileSync(outPath, `${head('Sennable-flow demo')}
<body><div class="wrap"><h1>Sennable-flow: Jev's picks in the panel</h1>
<p class="mut">Drawn by the mod's own code (hooks/register.tsx) from a live Jev run on ${new Date().toISOString().slice(0, 10)}. Runs, costs and the cache countdowns are sample values.</p>
<h2>Band above the prompt</h2><div class="card">${band}</div>
<h2>Band with no flow running (switch on / off)</h2><div class="card"><b>◉ sennable-flow on</b>${m.slimSvg(760, 'real work is planned and delegated', 52 * 60_000 + 10_000)}</div><div class="card"><b>○ sennable-flow off</b>${m.slimSvg(760, 'answers in this session', 7 * 60_000 + 40_000)}</div><p class="mut">The switch is a button in the app (shown here as bold text); the countdown turns amber under 10 minutes.</p>
<h2>Agents panel</h2><div class="card" style="max-width:${W + 30}px">${rows.join('')}</div>
<h2>What Jev answered</h2><div class="card"><table><tr><th>Task</th><th>Model · effort</th><th>Skill</th><th>Jev sure</th><th>Fell back</th></tr>${table}</table></div>
</div></body></html>`);
  console.log('wrote', outPath);
}

function fixtureJev(m, at, W) {
  const tasks = m.cleanTasks([
    { title: 'Write the issue fetcher', model: 'sonnet', effort: 'medium', skill: 'none', sure: 0.86 },
    { title: 'Sort 216 issues into buckets', model: 'jev', effort: 'none', skill: 'none', sure: 0.91, state: 'running', label: 'Jev 1.13' },
    { title: 'Tag 170 journeys with flows', model: 'jev', effort: 'none', skill: 'none', sure: 0.88, state: 'done', label: 'Jev 1.13' },
    { title: 'Sort 80 QA screenshots by screen', model: 'jev_image', effort: 'none', skill: 'none', sure: 0.77, state: 'running', label: 'Jev 1.13 · images' },
  ]);
  const flow = { title: 'Open work sort', total: tasks.length, done: 1, running: 2, phase: 'delegate', isFinished: false, tasks };
  const list = [{
    id: 'r0', agentId: 'a0', type: 'sennable-worker', description: 'Fetch issues', model: 'claude-haiku-5-5', effort: 'low',
    status: 'done', startedAt: at - 200_000, endedAt: at - 159_000, contextTokens: 18_000, contextMax: 1_000_000,
    tokens: 29_000, costUsd: 0.01, steps: 3, round: 1, stepDone: 3, stepTotal: 3,
  }];
  const sec = m.paneSections(flow, list);
  const t = m.totals(list, at);
  const rowSvgOf = r => (r.kind === 'agent' ? m.agentSvg(W, r.a, at, flow) : m.plannedSvg(W, r.p, r.status));
  const jevRowOf = n => [...sec.running, ...sec.finished].find(r => r.kind === 'jev' && r.p.n === n);
  const rowFor = n => { const r = jevRowOf(n); return r ? rowSvgOf(r) : ''; };
  const compact = m.compactSvg(W, list, sec.planned, t, m.jevRunsOf(flow));
  const mix = MIX.map(x => [x, tasks.filter(k => k.model === x).length]).filter(([, n]) => n);
  const extras = { mix, mainLeft: 56 * 60_000, workerLeft: 8 * 60_000 + 12_000 };
  const crab = m.bandCrab(flow, list);
  const band = m.rowSvg(flow, 960, crab.isWorking, extras, crab.family);

  const row2 = rowFor(2), row3 = rowFor(3), row4 = rowFor(4);
  const checks = {
    counts: JSON.stringify(sec.counts) === JSON.stringify({ running: 2, finished: 2, planned: 1 }),
    task2_color: row2.includes('#E551BA'),
    task2_live: row2.includes('class="live"'),
    task2_not_dimmed: row2.includes('opacity="1"'),
    task2_walking: row2.includes(' run"'),
    task2_costume: /class="c-jev[ "]/.test(row2),
    task3_done_tick: row3.includes('stroke="#3B9C5F"'),
    task4_color: row4.includes('#A8358A'),
    task4_costume: /class="c-jev_image[ "]/.test(row4),
    compact_both_colors: compact.includes('#E551BA') && compact.includes('#A8358A'),
    band_jev_walking: /class="c-jev run"/.test(band),
    band_color: band.includes('#E551BA'),
  };

  const section = (text, n) => (n ? `<div class="sec">${text} · ${n}</div>` : '');
  const pane = [
    m.headerSvg(W, flow.title, t),
    section('Running', sec.counts.running), ...sec.running.map(rowSvgOf),
    section('▾ Finished', sec.counts.finished), ...sec.finished.map(rowSvgOf),
    section('Planned', sec.counts.planned), ...sec.planned.map(p => m.plannedSvg(W, p)),
  ].join('');
  const outDir = join(here, 'out');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'jev-panel.html'), `${head('Jev in the panel')}
<body><div class="wrap"><h1>Jev tasks in the agents panel</h1>
<p class="mut">Drawn by the mod's own code (hooks/register.tsx, <code>paneSections</code>) from a fixture flow: task 1 Sonnet planned, task 2 Jev running, task 3 Jev done, task 4 Jev · images running, one finished Haiku run. Jev wears the magenta cap.</p>
<h2>Band above the prompt (only Jev working)</h2><div class="card">${band}</div>
<h2>Compact crab row</h2><div class="card" style="max-width:${W + 30}px">${compact}</div>
<h2>Agents panel</h2><div class="card" style="max-width:${W + 30}px">${pane}</div>
</div></body></html>`);

  const pic = (key, scale, walking) => {
    const w = Math.ceil(31 * scale), hgt = Math.ceil(29 * scale);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}">${m.PANE_CSS}${m.CRAB_CSS}${m.crab(0, 0, key, false, walking, scale)}</svg>`;
  };
  const cells = [['jev', 'Jev (text)'], ['jev_image', 'Jev · images']].map(([k, name]) => `<div class="cell">${pic(k, 5, false)}<div>${name}</div><div class="mut">${k}, 5×</div></div>
<div class="cell">${pic(k, 1.1, false)}${pic(k, 1.1, true)}<div class="mut">panel scale, still and walking</div></div>`).join('');
  writeFileSync(join(outDir, 'jev-costumes.html'), `${head('Jev costume')}
<body><div class="wrap"><h1>Jev costume</h1>
<p class="mut">A magenta cap with TypeSafe's mark (black on magenta). The image twin also carries a small grey camera. Drawn by hooks/register.tsx's own <code>crab()</code>.</p>
<div class="card"><div class="grid">${cells}</div></div>
</div></body></html>`);

  console.log(JSON.stringify({ counts: sec.counts, checks }, null, 2));
  console.log('wrote', join(outDir, 'jev-panel.html'));
  console.log('wrote', join(outDir, 'jev-costumes.html'));
  return Object.values(checks).every(Boolean) ? 0 : 1;
}
