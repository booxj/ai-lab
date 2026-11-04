#!/usr/bin/env node
/**
 * 扫描 results/**/vNN/meta.json，生成 results/index.json 与 results/index.js。
 * 用法：
 *   node scripts/build-index.mjs          写入
 *   node scripts/build-index.mjs --check  只比对，不写入（CI 用）
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';

const ROOT = process.cwd();
const RESULTS = join(ROOT, 'results');
const RUN_RE = /^v\d{2}$/;

function findRunDirs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) continue;
    if (RUN_RE.test(name)) out.push(p);
    else findRunDirs(p, out);
  }
  return out;
}

const dirs = findRunDirs(RESULTS).filter((d) => !relative(ROOT, d).startsWith('results/_TEMPLATE'));

const entries = [];
for (const dir of dirs) {
  const rel = relative(RESULTS, dir).replaceAll('\\', '/');
  const metaFile = join(dir, 'meta.json');
  if (!existsSync(metaFile)) continue;
  let meta;
  try { meta = JSON.parse(readFileSync(metaFile, 'utf8')); }
  catch { continue; }
  entries.push({
    id: rel,
    model: basename(dirname(dirname(dir))),
    case: basename(dirname(dir)),
    run: basename(dir),
    capability: meta.capability,
    hall: meta.hall ?? null,
    title: meta.title,
    preview: `${rel}/preview.png`,
    entry: `${rel}/result.html`,
    legacy: meta.provenance === 'legacy-import',
    generated_at: meta.generated_at,
    latest: false,
  });
}

entries.sort((a, b) => a.id.localeCompare(b.id));

const latestBy = new Map();
for (const e of entries) {
  const key = `${e.model}/${e.case}`;
  const prev = latestBy.get(key);
  if (!prev || e.run > prev.run) latestBy.set(key, e);
}
for (const e of entries) e.latest = latestBy.get(`${e.model}/${e.case}`) === e;
entries.sort((a, b) => (a.latest === b.latest ? a.id.localeCompare(b.id) : a.latest ? -1 : 1));

const payload = {
  schema_version: 1,
  generated_by: 'scripts/build-index.mjs',
  counts: {
    works: entries.length,
    latest: entries.filter((e) => e.latest).length,
    legacy: entries.filter((e) => e.legacy).length,
  },
  entries,
};

const json = JSON.stringify(payload, null, 2) + '\n';
const js = `/* 自动生成，勿手改；重生成：node scripts/build-index.mjs */\nwindow.AI_LAB_RESULTS = ${JSON.stringify(payload, null, 2)};\n`;

const files = { 'index.json': json, 'index.js': js };
const check = process.argv.includes('--check');
let drift = false;

for (const [name, content] of Object.entries(files)) {
  const path = join(RESULTS, name);
  const old = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (check) {
    if (old !== content) { console.error(`DRIFT results/${name}`); drift = true; }
  } else {
    writeFileSync(path, content);
    console.log(`WROTE results/${name}`);
  }
}

if (check) {
  if (drift) { console.error('索引与结果目录不同步，请运行 node scripts/build-index.mjs'); process.exit(1); }
  console.log(`OK  索引已同步（${entries.length} 条，${payload.counts.latest} 个最新）`);
} else {
  console.log(`OK  ${entries.length} 条，${payload.counts.latest} 个最新，${payload.counts.legacy} 条 legacy`);
}
