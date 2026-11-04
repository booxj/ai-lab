# AI-LAB 目录与作品收录规范

> 版本：v1（2026-11-04）
> 状态：生效。新增作品一律按本规范落盘；既有文件不追溯重写。
> 适用仓库：`booxj/ai-lab`，工作分支 `trae/agent-0E5LWk`。

---

## 0. 先校正事实（以实际仓库为准）

写这份规范前重新核对了工作副本，以下路径**在本仓库中并不存在**，规范不再假设它们存在：

| 背景里提到的 | 实际状态 |
|---|---|
| `site/` | 不存在。旧 demo 实际是根 `index.html` + `web/`、`video/`、`deck/`、`game/`、`assets/`、`tools/` |
| `results/demo-lab/`、5 个 200 字节桩页 | 不存在。`results/` 由本规范首次创建 |
| `scripts/build-index.mjs` | 不存在。本规范新增 `scripts/`，并实现索引与校验脚本 |
| `site/cases.js` 已删、链路断了 | 没有 `site/`，也没有 `cases.js`，不存在这条链路 |
| `cases/` | 不存在。本规范首次创建 |
| `.screenshots/`（429 张、约 400 MB） | 不存在，也从未入库 |
| `README.md` 的收录硬性要求 | 实际 `README.md` 只有一行 `# ai-test`，没有收录条款 |

因此本规范不是“修补旧链路”，而是**从零定义**；下面所有路径都是新建的。旧的四个 demo 页按第 9 节冻结处理。

---

## 1. 顶层职责划分

```
ai-lab/
├── halls/            展厅与界面。只负责“怎么看”，不生产作品
│   ├── _shell/       七洲共享壳层（hall.css / hall.js / configs.js）
│   ├── eu/ as/ sa/ na/ af/ oc/ an/
│   ├── index.html    七洲总览
│   └── assets/       展厅自己的建筑图与分层图
├── cases/            题面（brief）。只写“让模型做什么”，不放成品
│   ├── c1/ c2/ c3/ c4/
│   └── README.md
├── results/          作品与元信息。唯一允许放生成物的地方
│   ├── _TEMPLATE/    可复制的空模板，不参与索引
│   ├── _legacy/      历史迁移物，不参与“新作品”统计
│   └── <model-slug>/<case-id>/v<NN>/
├── scripts/          构建与校验。不产出作品
│   ├── validate-results.mjs
│   └── build-index.mjs
├── docs/             规范、决策记录
├── assets/           旧 demo 共用的字体/样式/脚本（冻结，不再新增）
├── web/ video/ deck/ game/  旧 demo 四个门类页（冻结）
├── tools/            本地开发工具（现状保留）
└── index.html        旧 demo 入口（冻结）
```

边界规则：

- **`halls/` 不复制作品**。展厅只读 `results/index.js`，不把作品 HTML 塞进 `halls/`。
- **`cases/` 不产出文件**。题面里可以写示例代码片段，但成品必须进 `results/`。
- **`results/` 不接受散落文件**。每件作品必须是一个完整的 `v<NN>/` 目录，四件套齐全。
- **`scripts/` 不写业务内容**。只做扫描、校验、生成索引。
- **`site/`**：不存在，不新建。旧 demo（根 `index.html` 与四个目录）按第 9 节**冻结**，不删、不扩写、不作为新入口。

---

## 2. 路径模板与命名

### 2.1 唯一模板

```
results/<model-slug>/<case-id>/v<NN>/
├── result.html     入口，必须能离线打开
├── preview.png     首屏预览，1440×900
├── prompt.md       原始提示词，逐字
└── meta.json       元信息，见第 3 节
```

真实示例（新作品）：

```
results/deepseek-v4-1-flash/c1-editorial-001/v01/
results/gemini-3-pro/c3-film-001/v02/
results/claude-opus-4-6/c2-launch-deck-001/v01/
```

历史迁移示例：

```
results/_legacy/c1-web-gallery-001/v01/
```

### 2.2 `model-slug` 规则

- 只允许小写 ASCII 字母、数字、单个连字符：`^[a-z0-9]+(-[a-z0-9]+)*$`。
- 不含点、下划线、空格、斜杠、中文、版本号前缀 `v`。
- 语义是**稳定产品线**，不是某次构建：`deepseek-v4-1-flash`、`gemini-3-pro`、`claude-opus-4-6`。
- 精确构建号（`2026-11-04`、`preview-3`、commit sha）只写进 `meta.model.version`，**不进路径**。
- 同一产品线改名（例如 `deepseek-v4` → `deepseek-v5`）视为新 slug；旧目录保留，不重命名。
- `_TEMPLATE`、`_legacy` 是保留名，不能当模型 slug。

### 2.3 `case-id` 规则

- 前缀固定四选一：`c1` 网页、`c2` HTML PPT、`c3` HTML 短片、`c4` 游戏。
- 结构：`<cN>-<topic-slug>-<3 位序号>`。
- `topic-slug` 小写 kebab，2–4 个词，例如 `editorial`、`launch-deck`、`aurora-film`、`arcade-loop`。
- 序号 `001` 起，代表**题面编号**，不随重跑变化。
- 完整正则：`^(c1|c2|c3|c4)-[a-z0-9]+(-[a-z0-9]+)*-\d{3}$`。
- 示例：`c1-editorial-001`、`c2-launch-deck-001`、`c3-aurora-film-001`、`c4-arcade-loop-001`。

### 2.4 运行版本 `v<NN>`

- 两位数字，`v01` 起，只增不改：`v01`、`v02`……`v99`。
- **任何一次重跑都新建目录**，哪怕只改一个字；禁止覆盖旧 `vNN`。
- 目录名必须与 `meta.run` 完全一致。
- “最新版”定义为同一 `<model-slug>/<case-id>` 下数字最大的 `vNN`，由 `scripts/build-index.mjs` 计算，不手写。

### 2.5 禁止的命名

```
results/最终版/                  ← 中文、无版本
results/deepseek v4.1/           ← 空格、点
results/demo-lab/                ← 无 case-id、无版本
results/c1-editorial-001/        ← 缺 model-slug 与 vNN
results/DeepSeek/C1-Editorial/   ← 大写
```

---

## 3. 必备文件与字段

### 3.1 文件四件套（缺一不可）

| 文件 | 硬性要求 |
|---|---|
| `result.html` | 入口；双击可离线打开；不依赖 `http(s)://`；不依赖仓库外路径；单文件 ≤ 3 MB |
| `preview.png` | 1440×900 首屏；PNG；≤ 1.5 MB；无浏览器地址栏/书签栏 |
| `prompt.md` | 原始提示词，逐字；不改写、不翻译、不补全；UTF-8；仅本次提交给模型的用户提示词 |
| `meta.json` | 合法 JSON；字段见 3.2；必须与目录名、文件实际大小一致 |

补充：

- 需要系统提示词或负面提示词时，另放 `prompt.system.md` / `prompt.negative.md`，仍保持逐字；`prompt.md` 只放用户提示词。
- 需要多张预览时，只允许再加 `preview-mobile.png`（390×844，≤ 1 MB），主预览仍是 `preview.png`。
- 作品自带资源（图片、字体、音频）只能放在同版本目录内，例如 `assets/`；不得引用 `../../../../assets`（`_legacy` 例外，见第 9 节）。
- 禁止在 `result.html` 里写 `fetch()` 读远程 JSON；离线打开会失败。

### 3.2 `meta.json` 字段表

| 字段 | 类型 | 必填 | 规则 |
|---|---|---|---|
| `schema_version` | int | 是 | 当前固定 `1` |
| `case_id` | string | 是 | 必须等于上两级目录名 |
| `run` | string | 是 | 必须等于 `vNN` 目录名 |
| `title` | string | 是 | 作品标题，中文或英文，≤ 60 字 |
| `capability` | enum | 是 | `c1` / `c2` / `c3` / `c4`，必须与 case-id 前缀一致 |
| `hall` | enum | 否 | `eu` / `as` / `sa` / `na` / `af` / `oc` / `an`；未定则省略 |
| `model.name` | string | 是 | 展示名，如 `DeepSeek V4.1 Flash` |
| `model.slug` | string | 是 | 必须等于 `<model-slug>` 目录名 |
| `model.version` | string | 是 | 精确版本/构建号，不接受 `latest` |
| `model.provider` | string | 是 | 厂商或本地部署方 |
| `access.channel` | enum | 是 | `web-ui` / `api` / `cli` / `local` |
| `access.endpoint` | string | 否 | API 域名或工具名；不写密钥 |
| `access.region` | string | 否 | 区域，如 `cn`、`us` |
| `generated_at` | string | 是 | ISO 8601 带时区，如 `2026-11-04T15:40:00+08:00` |
| `human_intervention.level` | enum | 是 | `none` / `light` / `heavy` |
| `human_intervention.notes` | string | 否 | 改了哪里；`none` 时也必须为空字符串 |
| `duration_seconds` | number | 是 | 从提交到拿到成品的墙钟秒数 |
| `cost.currency` | string | 是 | ISO 4217，如 `CNY`、`USD` |
| `cost.amount` | number | 是 | 实际花费；免费填 `0` |
| `cost.basis` | string | 是 | 计费口径，如 `按 token`、`订阅内`、`本地电费` |
| `license.code` | string | 是 | SPDX 标识或 `TBD`；`TBD` 不得合并进主线 |
| `license.content` | string | 是 | 生成内容许可，如 `CC-BY-4.0`、`TBD` |
| `license.assets` | string | 是 | 内嵌素材许可；无内嵌素材填 `none` |
| `entry` | string | 是 | 固定 `result.html` |
| `preview` | string | 是 | 固定 `preview.png` |
| `prompt` | string | 是 | 固定 `prompt.md` |
| `offline.ready` | bool | 是 | 双击能开为 `true` |
| `offline.self_contained` | bool | 是 | 不依赖版本目录外文件为 `true` |
| `offline.external_refs` | array | 是 | 外部引用列表；没有填 `[]` |
| `notes` | string | 否 | 已知问题、复现条件、降级说明 |

完整示例：

```json
{
  "schema_version": 1,
  "case_id": "c1-editorial-001",
  "run": "v01",
  "title": "极简编辑风落地页",
  "capability": "c1",
  "hall": "eu",
  "model": {
    "name": "DeepSeek V4.1 Flash",
    "slug": "deepseek-v4-1-flash",
    "version": "V4.1-Flash-2026-11-04",
    "provider": "DeepSeek"
  },
  "access": {
    "channel": "api",
    "endpoint": "https://api.deepseek.com",
    "region": "cn"
  },
  "generated_at": "2026-11-04T15:40:00+08:00",
  "human_intervention": {
    "level": "light",
    "notes": "仅修正 3 处中文断行，未改结构与配色"
  },
  "duration_seconds": 214,
  "cost": {
    "currency": "CNY",
    "amount": 0.42,
    "basis": "按 token 计费"
  },
  "license": {
    "code": "TBD",
    "content": "TBD",
    "assets": "none"
  },
  "entry": "result.html",
  "preview": "preview.png",
  "prompt": "prompt.md",
  "offline": {
    "ready": true,
    "self_contained": true,
    "external_refs": []
  },
  "notes": "1440 与 390 无横向滚动；reduced-motion 下关闭视差。"
}
```

---

## 4. 多版本与不覆盖

### 4.1 同一模型、同一案例多次产出

```
results/deepseek-v4-1-flash/c1-editorial-001/v01/
results/deepseek-v4-1-flash/c1-editorial-001/v02/
results/deepseek-v4-1-flash/c1-editorial-001/v03/
```

- 每次都是**完整四件套**，不引用上一版资源。
- `v02` 的 `prompt.md` 是这一次的原始提示词，不是“与 v01 的 diff”。
- 想说明两版差异，写进 `meta.notes`，不要新建 `diff.md`。

### 4.2 模型版本迭代

- 产品线不变、只换构建：同一 `model-slug`，新 `vNN`，`meta.model.version` 写新构建号。
- 产品线改名或跨代：新建 `model-slug` 目录，例如 `deepseek-v5`；旧目录保留。
- 不允许把模型版本塞进 case-id 或 vNN 名称。

### 4.3 删除与回滚

- 不删除已合并的 `vNN`；回滚靠“指向旧版”，不靠删新版。
- 索引由脚本重算，不手改 `results/index.js`。

---

## 5. 体积与仓库纪律

### 5.1 硬上限

| 对象 | 上限 | 超出处理 |
|---|---|---|
| `result.html` | 3 MB | 拆资源到同目录 `assets/`，仍超则压缩/改用外链图 |
| 单件作品 `vNN/` 合计 | 8 MB | 大素材走 LFS 或外链，`meta.offline.external_refs` 记录 |
| `preview.png` | 1.5 MB | 减色/压缩，禁止改小到看不清 |
| `prompt.md` | 200 KB | 超长提示词附件化，正文仍逐字 |
| 仓库总体 | 250 MB | 停止新增二进制，先清理或转 LFS |
| 单个二进制文件 | 5 MB | 必须 LFS |
| 单个外部素材 | 20 MB | 不放仓库，走外链并写 `external_refs` |

### 5.2 一律不入库

- 迭代截图、调试截图、对比图（只留最终 `preview.png`）
- `node_modules/`、构建缓存、`dist/`、`.cache/`
- 录屏原片（`.mp4` / `.mov` / `.webm`），需要时给外链
- 临时脚本、日志、`.DS_Store`、编辑器配置
- API 密钥、账单原文、含个人信息的文件
- 与作品无关的“素材库原图”
- 同一作品的重复导出（只保留入库的那一版）

### 5.3 单个文件该不该提交：五问判据

1. **入口需要它才能离线渲染吗？** 否则不提交。
2. **它是最终产物，还是中间产物？** 中间产物不提交。
3. **体积在 5.1 上限内吗？** 超限先 LFS，再考虑外链。
4. **它含密钥、隐私或未授权第三方素材吗？** 含则一律不提交。
5. **删掉它，`result.html` 还能完整复现吗？** 不能才提交；能则外置。

五问全过才 `git add`；任何一问失败，先处理再提交。

---

## 6. 展厅与作品的连接

### 6.1 连接方式：构建期索引，不用运行时 fetch

- `scripts/build-index.mjs` 扫描 `results/**/vNN/meta.json`，生成：
  - `results/index.json`：给工具与人看；
  - `results/index.js`：`window.AI_LAB_RESULTS = {...}`，给展厅用。
- 展厅用 `<script src="../../results/index.js">`（从 `halls/<id>/index.html` 出发）或 `<script src="../results/index.js">`（从 `halls/index.html` 出发）。
- **不用 `fetch('results/index.json')`**：`file://` 下会被 CORS 拦，违背离线要求。
- 展厅只读索引，不读作品文件；点击卡片时才跳转到 `../../results/<model-slug>/<case-id>/vNN/result.html`。
- 本轮不修改 `halls/` 页面逻辑；索引已生成，接线留到下一轮。

### 6.2 四类能力与 case-id 前缀

| case-id 前缀 | 能力 | 对应门 | 门序号 | `halls/_shell/hall.js` 里的 key |
|---|---|---|---|---|
| `c3` | HTML 短片 | 影像门 | I | `video` |
| `c1` | 网页 | 网页门 | II | `web` |
| `c2` | HTML PPT | 幻灯片门 | III | `deck` |
| `c4` | 游戏 | 游戏门 | IV | `game` |

注意顺序不是 C1→C4：**C3 在影像门（I），C1 在网页门（II）**。索引里以 `capability` 字段为准，不靠目录顺序猜。

### 6.3 展厅侧字段约定

索引条目最少包含：

```json
{
  "id": "deepseek-v4-1-flash/c1-editorial-001/v01",
  "model": "deepseek-v4-1-flash",
  "case": "c1-editorial-001",
  "run": "v01",
  "capability": "c1",
  "hall": "eu",
  "title": "极简编辑风落地页",
  "preview": "deepseek-v4-1-flash/c1-editorial-001/v01/preview.png",
  "entry": "deepseek-v4-1-flash/c1-editorial-001/v01/result.html",
  "latest": true
}
```

路径均相对 `results/`，展厅据此拼绝对相对路径。

---

## 7. 校验机制

### 7.1 脚本清单

| 脚本 | 职责 | 是否已实现 |
|---|---|---|
| `scripts/validate-results.mjs` | 四件套存在性、`meta.json` 必填字段、目录名一致性、case-id/model-slug 正则、PNG 尺寸、体积上限、`http(s)` 外链与绝对路径扫描 | 是 |
| `scripts/build-index.mjs` | 生成 `results/index.json` 与 `results/index.js`；`--check` 模式只比对不写入，用于 CI 防漂移 | 是 |
| `scripts/check-links.mjs` | 校验索引里的 `entry` / `preview` 路径真实存在；可并入 validate，暂不单列 | 否（并入 validate） |
| `scripts/screenshot.mjs` | 统一产出 `preview.png`（1440×900）与可选移动图 | 否（下一轮做，避免与展厅截图脚本重复） |

### 7.2 CI 跑哪几个

```
node scripts/validate-results.mjs
node scripts/build-index.mjs --check
```

两个都通过才允许合并。第一条失败会指出具体文件与原因；第二条失败说明索引没重生成。

### 7.3 本地命令

```bash
node scripts/validate-results.mjs
node scripts/build-index.mjs
node scripts/build-index.mjs --check
```

---

## 8. 从零新增一件作品（操作顺序）

1. 在 `cases/cN/TASK.md` 选题面，确认 `case-id` 未被占用。
2. 复制 `results/_TEMPLATE/v01/` 到 `results/<model-slug>/<case-id>/v01/`。
3. 放 `result.html`；先断言 `file://` 能开，再截图。
4. 截图存 `preview.png`（1440×900，≤1.5 MB）。
5. 原样保存 `prompt.md`。
6. 填 `meta.json`；`license` 未定就写 `TBD`，但**不要合并**。
7. `node scripts/validate-results.mjs`；全绿后再 `node scripts/build-index.mjs`。
8. 只 `git add` 该 `vNN/` 目录与索引两个文件；不 `git add -A`。

---

## 9. 旧 demo（实际不存在 `site/`）的处置：冻结

- 范围：根 `index.html`、`web/`、`video/`、`deck/`、`game/`、`assets/`、`tools/`。
- 决策：**冻结，不删、不扩写、不接新作品**。`halls/` 是唯一对外入口。
- 理由：保留历史与素材来源，避免一次性大删除；旧页面的绝对路径 `/assets/...` 只在 HTTP 根目录下有效，不适合作为离线作品。
- 迁移示范只做一份拷贝，不改旧文件：`web/index.html` → `results/_legacy/c1-web-gallery-001/v01/result.html`，并把 `/assets/` 改为 `../../../../assets/`，使其在仓库内 `file://` 可开。原始 `web/index.html` 保留不动。
- `_legacy` 条目不参与“新作品”统计，索引里标 `legacy: true`；`self_contained` 为 `false` 属已知例外。

---

## 10. 需要仓库所有者决定的事（我不替你定）

1. **许可证**：`license.code/content/assets` 的最终取值（CC、MIT、保留所有权利、或混合）。模板统一 `TBD`，合并前必须由你拍板。
2. **`model-slug` 的命名口径**：是否允许厂商缩写（`ds`）、是否把推理档位（`thinking` / `fast`）并入 slug。当前规则只定义字符与层级，不指定品牌命名。
3. **成本口径**：是否折算订阅摊销、本地电费、免费额度；`cost.amount` 是否允许填 `0` 并写 `basis`。
4. **仓库体积红线**：250 MB 是当前建议值；若准备长期放大量预览图，需要你确认是否改用 Git LFS 或对象存储。
5. **旧的四个 demo 页是否最终删除**：本规范只冻结，不授权删除。
6. **是否启用 CI**：脚本已就绪，但工作流文件未创建；要不要加 `.github/workflows/results.yml` 由你定。
7. **展厅何时接线**：本轮未改 `halls/` 逻辑；索引格式已定，接线时间由你排。
