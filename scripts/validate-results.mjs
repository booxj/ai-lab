#!/usr/bin/env node
/**
 * 校验 results/**/vNN/ 是否符合 docs/CONVENTIONS.md。
 * 零依赖，node scripts/validate-results.mjs
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';

const ROOT = process.cwd();
const RESULTS = join(ROOT, 'results');
const CASE_RE = /^(c1|c2|c3|c4)-[a-z0-9]+(-[a-z0-9]+)*-\d{3}$/;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RUN_RE = /^v\d{2}$/;

const LIMITS = {
  result: 3 * 1024 * 1024,
  preview: 1.5 * 1024 * 1024,
  work: 8 * 1024 * 1024,
  prompt: 200 * 1024,
};

const errors = [];
const warns = [];

function err(where, msg) { errors.push(`${where}: ${msg}`); }
function warn(where, msg) { warns.push(`${where}: ${msg}`); }

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function findRunDirs(dir, out = []) {
  let names = [];
  try { names = readdirSync(dir); } catch { return out; }
  for (const name of names) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) continue;
    if (RUN_RE.test(name)) out.push(p);
    else findRunDirs(p, out);
  }
  return out;
}

function pngSize(file) {
  const b = readFileSync(file);
  if (b.length < 24 || b.toString('ascii', 1, 4) !== 'PNG') return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const REQUIRED = [
  'schema_version', 'case_id', 'run', 'title', 'capability',
  'model.name', 'model.slug', 'model.version', 'model.provider',
  'access.channel', 'generated_at', 'human_intervention.level',
  'duration_seconds', 'cost.currency', 'cost.amount', 'cost.basis',
  'license.code', 'license.content', 'license.assets',
  'entry', 'preview', 'prompt',
  'offline.ready', 'offline.self_contained', 'offline.external_refs',
];

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

if (!existsSync(RESULTS)) {
  console.error('results/ 不存在');
  process.exit(1);
}

const runs = findRunDirs(RESULTS);
if (!runs.length) warn('results', '没有找到任何 vNN 目录');

for (const dir of runs) {
  const rel = relative(ROOT, dir).replaceAll('\\', '/');
  if (rel.startsWith('results/_TEMPLATE')) continue;
  const isLegacy = rel.startsWith('results/_legacy/');

  for (const f of ['result.html', 'preview.png', 'prompt.md', 'meta.json']) {
    if (!existsSync(join(dir, f))) err(rel, `缺少 ${f}`);
  }
  if (!existsSync(join(dir, 'meta.json'))) continue;

  let meta;
  try {
    meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
  } catch (e) {
    err(rel, `meta.json 解析失败：${e.message}`);
    continue;
  }

  for (const key of REQUIRED) {
    const v = get(meta, key);
    if (v === undefined || v === null || v === '') err(rel, `meta.json 缺字段 ${key}`);
  }

  const caseDir = basename(dirname(dir));
  const modelDir = basename(dirname(dirname(dir)));
  const runName = basename(dir);

  if (meta.run !== runName) err(rel, `meta.run=${meta.run} 与目录 ${runName} 不一致`);
  if (meta.case_id !== caseDir) err(rel, `meta.case_id=${meta.case_id} 与目录 ${caseDir} 不一致`);
  if (!CASE_RE.test(meta.case_id || '')) err(rel, `case_id 不合规：${meta.case_id}`);
  if (!isLegacy && !SLUG_RE.test(modelDir)) err(rel, `model-slug 不合规：${modelDir}`);
  if (!isLegacy && meta.model?.slug !== modelDir) err(rel, `meta.model.slug 与目录 ${modelDir} 不一致`);
  if (!['c1', 'c2', 'c3', 'c4'].includes(meta.capability)) err(rel, `capability 非法：${meta.capability}`);
  if (meta.capability && !String(meta.case_id).startsWith(meta.capability)) err(rel, 'case_id 前缀与 capability 不一致');
  if (!['none', 'light', 'heavy'].includes(meta.human_intervention?.level)) err(rel, 'human_intervention.level 非法');
  if (!['web-ui', 'api', 'cli', 'local'].includes(meta.access?.channel)) err(rel, 'access.channel 非法');

  const ts = Date.parse(meta.generated_at || '');
  if (Number.isNaN(ts)) err(rel, `generated_at 不是合法 ISO 时间：${meta.generated_at}`);
  if (!(meta.offline?.ready === true || meta.offline?.ready === false)) err(rel, 'offline.ready 必须是布尔值');
  if (!Array.isArray(meta.offline?.external_refs)) err(rel, 'offline.external_refs 必须是数组');

  const pv = join(dir, 'preview.png');
  if (existsSync(pv)) {
    const s = statSync(pv);
    if (s.size > LIMITS.preview) err(rel, `preview.png 超过 1.5 MB（${(s.size / 1048576).toFixed(2)} MB）`);
    const dim = pngSize(pv);
    if (!dim) err(rel, 'preview.png 不是合法 PNG');
    else if (dim.w !== 1440 || dim.h !== 900) err(rel, `preview.png 尺寸 ${dim.w}×${dim.h}，应为 1440×900`);
  }

  const rh = join(dir, 'result.html');
  if (existsSync(rh)) {
    const s = statSync(rh);
    if (s.size > LIMITS.result) err(rel, 'result.html 超过 3 MB');
    const html = readFileSync(rh, 'utf8');
    if (meta.offline?.ready && /(src|href)\s*=\s*["']https?:\/\//i.test(html)) {
      err(rel, 'result.html 含 http(s) 外链，但 offline.ready=true');
    }
    if (!isLegacy && /(src|href)\s*=\s*["']\/assets\//i.test(html)) {
      err(rel, 'result.html 使用根绝对路径 /assets/');
    }
  }

  const pm = join(dir, 'prompt.md');
  if (existsSync(pm) && statSync(pm).size > LIMITS.prompt) err(rel, 'prompt.md 超过 200 KB');

  const total = ['result.html', 'preview.png', 'prompt.md', 'meta.json']
    .map((f) => (existsSync(join(dir, f)) ? statSync(join(dir, f)).size : 0))
    .reduce((a, b) => a + b, 0);
  if (total > LIMITS.work) err(rel, `作品目录超过 8 MB（${(total / 1048576).toFixed(2)} MB）`);

  if (meta.provenance === 'legacy-import') {
    if (meta.prompt_verbatim !== false) warn(rel, 'legacy-import 应显式写 prompt_verbatim=false');
    if (meta.offline?.self_contained !== false) warn(rel, 'legacy-import 依赖仓库资源，self_contained 应为 false');
  }
}

for (const w of warns) console.warn('WARN ' + w);
if (errors.length) {
  for (const e of errors) console.error('ERR  ' + e);
  console.error(`\n${errors.length} 个错误，${warns.length} 个警告`);
  process.exit(1);
}
console.log(`OK  ${runs.length} 个版本目录通过（${warns.length} 个警告）`);
