# AI LAB · 目录与素材约定（CONVENTIONS）

> 本文件是唯一的事实来源。新增作品、替换素材、接入真实内容之前，先对照本页逐条检查。
> 版本：v3（2026-11-06，改为「能力 → 作品 → 版本」三级目录，星图改为主干 / 短枝 / 版本叶）

---

## 0. 目录结构（只允许这些层级）

```
ai-lab/
├── index.html                  # 唯一入口：星图 + 能力页 + 作品页（hash 路由）
├── work.html                   # 跳转壳：?id=&v= → index.html#/<cap>/<id>[/<ver>]
├── works/                      # 三级数据与素材（唯一事实来源）
│   ├── capabilities.json       # 能力配置：id / name / en / color / order / enabled
│   └── <capability>/           # image | video | web | ppt | game
│       └── <work-id>/
│           ├── work.json       # 作品元数据（含 versions 列表）
│           ├── prompt-log.json # 需求时间线（追加式）
│           ├── work.js         # 构建产物：file:// 下的单件数据包（勿手改）
│           └── <version>/      # YYYYMMDD
│               ├── prompt.json # 该版本提示词快照
│               ├── 01.jpg …    # 详情图（从 01 连续）
│               ├── video.mp4   # 视频类
│               ├── poster.jpg  # 视频海报
│               └── thumb.jpg   # 缩略图 640×400
├── data/                       # 构建产物，全部由 tools/ 生成（勿手改）
│   ├── index.json              # 聚合索引：{capabilities, works}
│   ├── index.js                # index.json 的 file:// 镜像
│   └── thumbs.js               # 星图贴图 data URI
├── assets/
│   └── fonts/                  # 预留；本版不随包分发字体
├── vendor/                     # 三方库（统一只此一处）
│   ├── three.min.js
│   ├── 3d-force-graph.min.js
│   └── LICENSE-<lib>.txt
├── tools/                      # 本地构建脚本，不上线
│   ├── migrate_to_three_tier.py  # 一次性迁移（含备份 / --dry-run / --only）
│   ├── rollback_migration.py     # 迁移回滚
│   ├── build_index.py            # works/ → data/index.json + index.js + thumbs.js + work.js
│   ├── export_work.py            # 单件作品指定版本 → dist/<id>-<ver>/
│   └── verify.py
├── dist/                       # 导出产物（可随时删除，不入库）
├── backup/                     # 迁移备份（验收后删除，不入库）
├── docs/
│   ├── CONVENTIONS.md
│   └── SOURCES.md
└── README.md
```

未列入的目录不得在根层出现；`tools/`、`docs/`、`README.md`、`dist/`、`backup/` 属于工程文件，不参与线上发布。

---

## 1. work id 规则

作品节点 id 一律写作 `<type>-<model>-<seq>`，三段全部小写、用连字符连接：

| 段 | 取值 | 说明 |
|---|---|---|
| `type` | `image` / `video` / `web` / `ppt` / `game` | 与 `works.json` 的 `type` 字段逐字相同 |
| `model` | `flux` / `sora` / `claude` / `gpt` / `html` | 小写、无版本号、无空格（版本号进 `model` 字段，不进 id）；`html` 表示用 HTML/SVG/Canvas 手写生成的作品 |
| `seq` | 三位零填充 `001`…`999` | 同一 `<type>-<model>` 下连续递增，不复用已删除的序号 |

`model` 与 `series` 已降级为作品上的**标签**，仅用于展示与筛选，不再生成 `model-*` / `series-*` 分组节点。星图的层级改为「能力主干 → 作品短枝 → 版本叶」，见第 10 条。

示例：`image-flux-001`、`video-sora-002`、`web-claude-003`、`ppt-claude-001`、`game-gpt-002`。

---

## 2. id 与路径逐字一致

`id` 是路径的唯一来源，**不允许出现第二套命名**：

- 作品目录：`works/<capability>/<id>/`
- 版本目录：`works/<capability>/<id>/<version>/`
- 缩略图：`works/<capability>/<id>/<version>/thumb.jpg`
- 详情图：`works/<capability>/<id>/<version>/01.jpg`、`02.jpg`…（从 01 连续）
- 视频：`works/<capability>/<id>/<version>/video.mp4`，海报 `poster.jpg`
- 提示词：作品级 `prompt-log.json`；版本级 `<version>/prompt.json`

`work.json` 里的 `versions[].images`、`video`、`poster`、`thumb` 必须写成相对仓库根目录的路径字符串，且与磁盘文件逐字相同（大小写、连字符、序号都不能差）。改 id = 改目录 = 改 `work.json`，三件事必须同时完成，否则页面直接 404。

旧 `assets/images`、`assets/thumbs`、`assets/video` 与 `data/works.json` 已迁移完毕，仅保留在 `backup/pre-migration-20261106/` 中备查；新写入一律走 `works/` 三级目录。

---

## 3. 体积上限

| 类型 | 尺寸 | 体积上限 |
|---|---|---|
| 缩略图 `works/<cap>/<id>/<ver>/thumb.jpg` | 640 × 400（16:10 裁切） | ≤ 80 KB |
| 详情大图 `works/<cap>/<id>/<ver>/NN.jpg` | 长边 ≤ 2400 px（本版 2048 × 1280） | ≤ 1.2 MB |
| 视频 `works/<cap>/<id>/<ver>/video.mp4` | 1280 × 720，H.264 / yuv420p | ≤ 8 MB |
| 单页 HTML | 不引外部资源 | ≤ 60 KB |
| `data/index.json` | 16 件 / 32 版量级 | ≤ 40 KB（只放轻索引，不放提示词全文与 base64） |

超限的处理顺序：先降 JPEG quality（90 → 58 逐级），再降分辨率；不得通过拆更多文件绕过。生成脚本已内置逐级降质循环（`build_index.py` / `export_work.py`），新增素材请复用脚本，不要手工导出。

---

## 4. 许可记录

每一份非自制的素材与三方库，都必须在 `docs/SOURCES.md` 登记一行：

```
<文件或库> | <来源 URL 或「本地程序化生成」> | <许可：MIT / BSD-3-Clause / CC0 / 自有> | <取得日期>
```

- 三方库必须同时保留 `vendor/LICENSE-<lib>.txt`，且与 `docs/SOURCES.md` 记录一致；
- 同一库只能存在一份副本（本版已删除重复的 `assets/vendor/`，库统一放 `vendor/`）；
- 本版所有图像、视频、切片均为本地程序化生成，无外部图库素材；字体使用系统字体，不随包分发，因此 `assets/fonts/` 为空目录（预留）。

---

## 5. 数据源：三级目录 + 聚合索引

事实来源是磁盘上的三级目录，**不是**某个大 JSON：

```
works/capabilities.json                 能力配置
works/<capability>/<id>/work.json       作品元数据
works/<capability>/<id>/prompt-log.json 需求时间线
works/<capability>/<id>/<ver>/prompt.json 该版本提示词快照
```

`data/index.json` 是 `tools/build_index.py` 扫描上述文件生成的**只读轻索引**，结构：

```
{
  "capabilities": [{ "id", "name", "en", "color", "order" }],
  "works": [{
    "id", "title", "type", "capability", "model", "series",
    "tags", "status", "date", "createdAt", "currentVersion",
    "versionCount", "versions": [{ "version", "at", "status",
      "images", "video", "poster", "thumb" }],
    "thumb", "promptSummary"
  }]
}
```

索引里**不放**提示词全文与 base64，提示词由作品页按需读取 `prompt-log.json` / `<ver>/prompt.json`。

### 5.1 `work.json` 字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | ✓ | 见第 1 条 |
| `title` | string | ✓ | `中文 / English` 形式，两段之间用 ` / ` 分隔 |
| `type` | string | ✓ | `image` / `video` / `web` / `ppt` / `game` |
| `capability` | string | ✓ | 所属能力，与目录名一致 |
| `model` | string | ✓ | 生成模型名，含版本号，如 `FLUX.1`；`html` 表示手写 |
| `series` | string |  | 系列标签，仅展示 |
| `date` | string | ✓ | `YYYY-MM` 或 `YYYY-MM-DD` |
| `createdAt` | string |  | ISO 8601 带时区，如 `2026-11-06T14:32+08:00`；星图短枝按它排序 |
| `tags` | string[] | ✓ | 3 个以内，中文优先 |
| `status` | string | ✓ | `placeholder` 或 `final` |
| `currentVersion` | string |  | 当前版本号 `YYYYMMDD`；未定版可空 |
| `versions` | string[] |  | 版本号数组，升序；每项对应一个 `<version>/` 目录 |
| `prompt` | string |  | 用户原话，逐字保存，永不改写 |
| `promptSummary` | string |  | 最新一条需求的短摘要，供 hover 卡片 2 行展示 |

### 5.2 版本目录里的 `prompt.json`

| 字段 | 说明 |
|---|---|
| `version` | `YYYYMMDD` |
| `at` | 该版本定版时间，ISO 8601 带时区 |
| `effectivePrompt` | 该版本实际用于生成的完整提示词快照 |
| `promptSeqs` | `[起, 止]`，该版本覆盖的提示词日志 `seq` 范围 |
| `status` | `final` 等 |

构建命令：`python3 tools/build_index.py`。它会重写 `data/index.json`、`data/index.js`、`data/thumbs.js` 与每个作品的 `work.js`；这些文件一律不手改。`file://` 打开时 Chrome 禁止 fetch 本地 JSON，页面改用 `data/index.js` 与 `work.js` 里的 `window.AI_LAB_INDEX` / `window.AI_LAB_WORK_CACHE`。

`status: "placeholder"` 的作品在星图与作品页都要显示「样张」标注。

---

## 6. 占位必须标注

- `status: "placeholder"` 的作品：详情页右上角常驻「样张 / PLACEHOLDER」；讲义类图片本身也印有该字样；
- 星图首页计数区写明「样张」；
- 占位素材只用于结构与交互验收，不得当作成品对外发布；
- 升为 `final` 时：换真实素材、改 `status`、重跑 `build_index.py`，并在 `docs/SOURCES.md` 补登来源与授权。

---

## 7. 根目录不许放噪声

根层只允许：`index.html`、`work.html`、`works/`、`data/`、`assets/`、`vendor/`；工程目录 `tools/`、`docs/`、`README.md`、`dist/`、`backup/` 允许存在但不上线。

禁止出现在仓库内的东西：临时截图、`*.log`、编辑器备份、`.DS_Store`、`node_modules/`、构建中间产物、重复的库副本。验收脚本的截图输出目录放在仓库之外（`/Users/nizoukai/Documents/Trae-CN/temp_20261105_works/`），不要写进 `ai-lab/`。

---

## 8. 版本与并存

版本号 = **最后一次定版的日期**，格式 `YYYYMMDD`（例：`20261106`）。

### 8.1 什么时候升版本

**只在「定版」时创建版本。** 平时修改直接覆盖当前版本的文件与字段，不新增条目、不改版本号。

- 定版只能由**用户明确说「定版」**、或在询问后得到用户同意时触发；
- **绝不自行判断**某一轮改动算不算定版，也不要为了「留档」顺手加版本；
- 一版之内反复改，版本号保持不变（例：仍是 `20261106`，页面可显示「20261106 · 改动中」）；
- 不得伪造新版本号，也不得用当天日期擅自开新版本。

### 8.2 定版时做什么

1. 新建版本目录：`works/<capability>/<id>/<version>/`，把该版素材放进去（`01.jpg`…、`video.mp4`、`poster.jpg`、`thumb.jpg`）；
2. 写 `<version>/prompt.json`（`version` / `at` / `effectivePrompt` / `promptSeqs` / `status`）；
3. 在 `work.json` 的 `versions` 数组追加版本号，并把 `currentVersion` 指到它；
4. **旧版目录与旧条目一律保留**，不删除、不覆盖；
5. 重跑 `python3 tools/build_index.py`（同时刷新索引、贴图与 `work.js`）。

### 8.3 `versions` 条目怎么落到磁盘

`work.json` 的 `versions` 只存版本号字符串；每版的素材路径由构建器按 `<version>/` 目录自动发现，不重复写进 JSON，避免路径与磁盘两份事实。

### 8.4 为什么按版本隔离路径

旧单层路径（`assets/thumbs/<id>.jpg`）没有版本维度，覆盖式更新会让上一版素材永久丢失，无法做到「新旧并存」。版本目录让每一版在文件系统层面独立：切版本只切路径，删版本只删一个目录，且不会影响其它版本。迁移后旧路径只存在于 `backup/`，**新写入一律走版本目录**。

### 8.5 未定版作品

`status: "placeholder"` 或尚未定版的作品可以没有 `versions`，视为「未定版、单稿」，页面直接读顶层字段。首次定版时再补第一条版本。

---

## 9. 需求变更与提示词记录

### 9.1 三类文本分开存

| 类型 | 存放位置 | 规则 |
|---|---|---|
| `text`（用户原话） | `works/<cap>/<id>/prompt-log.json` 的 `log[].text` | **逐字，永不改写**，包括错别字与口语 |
| `effectivePrompt`（实际用于生成的那段） | `<version>/prompt.json` + 日志条目 | 与 `text` 不同时必须原样记录实际用的那段 |
| 成品 | `<version>/` 下的素材 | 不写进日志，只由构建器按目录发现 |

### 9.2 存放位置

- 每件作品一个独立文件：`works/<capability>/<id>/prompt-log.json`；
- **不塞进 `data/index.json`**，避免首屏数据膨胀；索引只带最新一条的 `promptSummary`；
- 日志是**追加式数组**，只增不改（`status` 字段除外）。

### 9.3 日志条目字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `seq` | number | 从 1 递增，不复用 |
| `at` | string | ISO 8601 带时区，如 `2026-11-06T14:32+08:00` |
| `kind` | string | `initial`（初始需求）/ `revision`（后续修改） |
| `text` | string | 用户原话，逐字 |
| `intent` | string | 一句话归纳，仅用于检索，不替代 `text` |
| `affects` | string \| string[] | `layout` / `color` / `copy` / `duration` / `audio` |
| `supersedes` | number \| null | 被本条取代的 `seq`；「改回去」也走这里 |
| `status` | string | `applied` / `superseded` / `rejected` |

### 9.4 硬规定：被推翻的需求不能删除

被后续需求推翻或用户否决的条目，**保留原文**，只改 `status`（`superseded` / `rejected`）。不得删除条目、不得改写 `text`、不得复用 `seq`。历史必须能还原「当时到底说了什么」。

### 9.5 定版时写追溯信息

定版写 `versions` 条目时，同时写入当时的 `promptSeqs` 范围与 `effectivePrompt` 快照，使「某一版是哪几条话的结果」可追溯。

### 9.6 展示规则

- **hover 卡片**：只显示最新一条的短摘要（`promptSummary`，2 行截断）+ 生成时间 + 版本标记（如「2 版 · 最新 20261106」），不显示整串日志；
- **作品页侧栏**：按 `seq` 升序；每条显示原话、时间、归纳；`superseded` / `rejected` 条目划掉或降透明度，但**仍然可见**，并标明被哪一条取代；
- **两版对比**：至少列出各版本的 `seq` 范围与 `effectivePrompt` 差异。

### 9.7 「改回去」怎么记

需求 A → 改成 B → 又改回 A，记两条 `revision`，后一条 `supersedes` 前一条，前一条转 `superseded`，**不删任何一条**：

```json
{
  "seq": 2,
  "at": "2026-11-07T10:12+08:00",
  "kind": "revision",
  "text": "片头标题改成手写体",
  "intent": "片头标题字体改为手写体",
  "affects": ["copy"],
  "supersedes": null,
  "status": "superseded"
},
{
  "seq": 3,
  "at": "2026-11-07T10:40+08:00",
  "kind": "revision",
  "text": "标题还是用原来的衬线体吧，改回去",
  "intent": "撤销 #2，恢复原衬线体标题",
  "affects": ["copy"],
  "supersedes": 2,
  "status": "applied"
}
```

初始需求（`kind: "initial"`）永不删除；大理、霞浦两支视频各只有 `seq: 1` 的 `initial` 记录。

---

## 10. 三级结构与星图视觉层级

### 10.1 三级

| 级 | 实体 | 存放 | 星图上的表现 |
|---|---|---|---|
| 一 | 能力 | `works/capabilities.json` | 一根主干（不同颜色、非等分角度、略微弯曲） |
| 二 | 作品 | `works/<cap>/<id>/work.json` | 从主干分出一根短枝 |
| 三 | 版本 | `works/<cap>/<id>/<version>/` | 短枝末端的叶片（一个小节点） |

作品不再直接摆在主干上；一个作品 = 一根短枝。单版作品只有一片叶。

### 10.2 短枝规则（确定性，不依赖力导向）

- **排序**：同一主干上的作品按 `createdAt` 升序，老的靠近根部（中心），新的靠外；`createdAt` 为空时退回 `date`，再退回 `id`；首件从主干 16% 处起抽枝，末件落在 92%（主干再往前收尖淡出）。
- **空能力不画枝**：某能力下没有作品时，不生成骨架点、不画主干，星图上不出现空枝；图例仍保留该能力条目，显示为灰色「暂无作品」，有作品后自动恢复。
- **骨架与作品数解耦**：主干骨架固定采样 12 段，作品只有 1–2 件时主干仍保持弯曲，不会退化成直棍。
- **主干**：每根主干有独立的长度（296–354）、弯折（±22–30°）与竖向弓起（±34–52°），`t` 越大弯得越多，不是等长射线。
- **角度**：短枝在主干法线方向分出，再按 `(hashJitter(id,"ang")−0.5)·28` 做 ±14° 的确定性旋转；同一侧抽枝（像蕨叶梳齿），避免左右交错后互相穿插。
- **形状**：三次贝塞尔。`C1 = P0 + T·0.28L + N·0.16L`（出发角约 30°，仍贴着主干走向）、`C2 = P0 + T·0.42L + N·0.60L`、`P3 = P0 + T·0.52L + N·0.86L`（末端 59°）。整根约 29° 的缓慢外翻，曲率集中在根部、越往外越直。
- **长度分档**：1 版 `70`、2 版 `84`、3 版及以上 `96`，再叠加 ±11% 的稳定抖动（`hashJitter(id,"tw")`）；同一主干上作品变多时整体乘 `clamp(1.55 − 0.055N, 0.52, 1)` 收短，主干同时按 `44·(N−4)` 加长。
- **粗细/亮度**：主干半径 `3.00→1.40`、不透明度 `1.00`；短枝半径 `1.55→0.08`、不透明度 `0.54`，颜色与米白混合 42% 以降饱和。主干另有 `7.4→4.0` 的外发光层。
- **透明度渐隐**：`alpha = 1 − smoothstep(0.28, 1.00, t)`，即根部 0–28% 保持实，28% 之后开始淡，到梢部为 0；半径按 `t^0.85` 收敛。
- **叶片排布**：短枝外段从 30% 到 100% 均匀排开，版本按 `version` 升序，最新版在末梢；叶片不用硬核贴图，只用柔光 + 外雾，避免锐利像素点。

### 10.3 远景抽稀（密度显示）

- 以默认全景距离 `baseDist` 为基准，计算 `camR = 相机到中心的三维距离`；
- `dk = clamp((1.62·baseDist − camR) / (0.32·baseDist), 0, 1)`，再用 `smoothstep` 平滑：`detailK = dk²(3−2dk)`；
- 即：**camR ≤ 1.30·baseDist 时完全展开；1.30× 开始收；1.62× 收完**，中间是平滑过渡，不跳变；
- 收的时候不改坐标：短枝连线与叶片透明度乘 `detailK` 渐隐，作品锚点（位于短枝 30% 处）透明度乘 `1−detailK` 渐显，最终每件作品在主干旁呈现为一个密度点；
- 只改透明度与缩放，不重算布局，因此来回缩放可逆、位置始终确定。
- **作品极少时关闭抽稀**：作品总数 ≤ 6 时 `detailK` 恒为 1，拉远也保持完整枝条，避免两件作品时一拉远就整片消失（不会闪）。

### 10.4 URL 规则

| URL | 内容 |
|---|---|
| `index.html#/` | 星图全景 |
| `index.html#/<capability>` | 能力页：该主干聚焦变亮，右侧列出该能力的全部作品 |
| `index.html#/<capability>/<work-id>` | 作品页：默认最新版 |
| `index.html#/<capability>/<work-id>/<version>` | 作品页：指定版本 |

四条 URL 均可冷启动直达，不依赖先打开星图。`work.html?id=<work-id>[&v=<version>]` 是兼容旧链接的跳转壳，会重定向到上面的规范地址。

### 10.5 file:// 与单文件版

- `file://` 下 Chrome 禁止 fetch 本地 JSON，页面依次读取 `data/index.js`（`window.AI_LAB_INDEX`）与 `works/<cap>/<id>/work.js`（`window.AI_LAB_WORK_CACHE`），两者都由 `build_index.py` 生成；
- 单文件版由 `temp_20261105_single/build_single.py` 从现版 `index.html` 生成：内联三方库、`index.json`、全部 `work.js` 与 1280px 预览图；**不内联 mp4**，视频作品只放海报并在页面标注；
- 单文件版仍须双击可开、零外部请求。

### 10.6 导出

```
python3 tools/export_work.py <work-id> [--version 20261106] [--zip]
python3 tools/export_work.py --all      # 全部作品各导一份
```

产物 `dist/<work-id>-<version>/`：`index.html`（自包含，离线可用）、`assets/`（该版素材）、`work.json`、`prompt-log.json`、`prompt.json`、`LICENSE.txt`。导出只读 `works/`，不回写。

### 10.7 新增一件作品需要动几个文件

最少 **3 个**（都在 `works/` 下，不需要碰 `index.html`）：

1. `works/<capability>/<id>/work.json` — 元数据
2. `works/<capability>/<id>/prompt-log.json` — 首条 `initial` 记录
3. `works/<capability>/<id>/<version>/` — 素材（`thumb.jpg` + `01.jpg`…或 `video.mp4` + `poster.jpg`）+ `prompt.json`

然后跑一次 `python3 tools/build_index.py`。星图、能力页、作品页、hover 卡片都会自动出现；`data/` 与 `work.js` 是生成物，不手改。

---

## 11. 查看器契约

### 11.1 一件作品 = 一个 HTML 入口

- 版本目录内 `index.html` 是**必需项**（`status: "placeholder"` 的占位件除外）：
  `works/<capability>/<work-id>/<version>/index.html`
- 所有类型（video / web / game / ppt / image）共用**同一个全屏查看器**：铺满屏幕的 iframe 直接加载 `index.html`。不再按类型做视频查看器、PPT 翻页器、图片缩放器。
- 该 HTML 已经包含了作品自己的播放、翻页、交互逻辑，外层不重复实现。

### 11.2 版本目录约定

```
works/<cap>/<work-id>/<version>/
  index.html     必需（占位件除外）— 作品实体，双击可开、无外部请求
  thumb.jpg      必需 — 只用于星图节点 / hover 卡片识别
  prompt.json    必需 — 该版本的提示词记录
  video.mp4      可选 — 附带导出物（视频类），不作为查看器入口
  poster.jpg     可选 — mp4 封面，也用于查看器加载前的静帧
  01.jpg…        可选 — 图片系列
```

- 视频类作品：原始形态是那支网页版影片，收进版本目录作为 `index.html`；`video.mp4` 只是导出物，保留但不作为入口。
- **缩略图与查看器入口解耦**：`thumb.jpg` 只负责"在星图上被识别"，不代表作品能展示什么；作品页负责真正展示。

### 11.3 占位件

- `work.json` 里 `status: "placeholder"` 的作品**没有** `index.html`，也不应该有。
- 作品页：不显示「打开作品」按钮，副标题标「样张 · 无可交互实体」，只保留图片浏览。
- 能力页列表写「样张 · 无可交互实体」；星图 hover 卡片角标为「样张」（灰点）。
- 真作品在同样位置标「可交互」（青色点），一眼可分。

### 11.4 查看器行为

- 入口：作品页的「打开作品 / OPEN」，打开全屏 iframe；`Esc`、「关闭」或「返回作品页」退出。
- 顶栏固定提供：返回作品页、当前作品 id / 标题、**新窗口打开 ↗**、关闭。
- 加载前先 `HEAD` 探测入口是否存在；不存在时给出「作品打不开」面板（含新窗口入口、重试、返回），而不是把 404 页面当成功。
- 8–9 秒未加载完成时提示"页面较大"，但保留继续等待与新窗口入口。
- `file://` 打开时，Chrome 会拦截"本地页面内嵌本地页面"，此时直接显示降级说明 + 新窗口入口，不出现白屏。
- 单文件版（`temp_20261105_single/`）无法内联网页与视频：查看器按钮仍展示，点击后给出"单文件版不内嵌"的说明与新窗口入口；该版本差异在交付说明里注明。

### 11.5 占位件可整体移出

- `status: "placeholder"` 的展品可以整批移出 `works/`，放到 `backup/placeholders-removed/works/<cap>/<id>/`，保留原目录结构；这是软删除，不删任何文件。
- 移出后重跑 `tools/build_index.py`：索引里不再有这些作品，**空能力不画枝**，图例保留五个能力条目并把空能力灰显为「暂无作品」。
- 恢复：把目录移回 `works/<cap>/`，再跑一次 `tools/build_index.py`，枝条与计数自动恢复，无需改代码。
- 移出不会改变 `status`：放回后仍标「样张 · 无可交互实体」，除非补齐版本目录里的 `index.html` 并改成 `final`。
- `backup/placeholders-removed/README.md` 记录了清单与恢复命令；不要把该目录当成 `works/` 的一部分去扫描。

---

## 附注：本版相对原始约定的实现说明

1. **分组节点退役**：原「模型 → 系列 → 单件」的 `model-*` / `series-*` 分组节点已删除；`model` 与 `series` 只作为作品标签展示。星图层级改为「能力主干 → 作品短枝 → 版本叶」（见第 10 条）。
2. **file:// 回退**：`data/index.js` 与每个作品的 `work.js` 是 `file://` 双击可开的必要条件，均由 `tools/build_index.py` 生成，不手改。
3. **素材形态**：图片走整图（长边 ≤ 2400），不再切 DZI；`video` 走 `<video>` + 海报；PPT 类走图片序列，保持整页可读。
4. **字体**：使用系统字体（Didot / Songti / PingFang），`assets/fonts/` 仅作预留，避免引入字体许可问题。
