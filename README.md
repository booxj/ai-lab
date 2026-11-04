# AI-LAB

AI 能力横评档案库 + 作品展：同一套题面发给不同模型，收集作品、提示词与元信息；地球总入口与七洲展厅负责呈现这些作品。

这是一个纯静态站点，不需要构建。仓库当前的重点不是宣传页，而是可离线打开的分层浏览结构。

## 层级与入口

- 一级 / 总入口：地球，`globe/index.html`。仓库根 `index.html` 只是 0 秒跳转壳，不是旧总览页。
- 二级：七洲展厅，`halls/index.html` → `halls/<洲>/index.html`。七洲页面已完成，共用 `halls/_shell/`。
- 三级：展厅内的建筑内景与四道能力门（影像 / 网页 / 幻灯片 / 游戏），内景是该洲的作品陈列。
- 最终内容：四类能力作品，统一落在 `results/`。

按浏览动线可读作：地球 → 七洲展厅（二级）→ 建筑内景（三级）→ 四类能力作品（最终内容）。

另有一条并列的二级支线：地球侧卡可直接进入建筑照片详情页 `globe/notre-dame/index.html`、`globe/kinkakuji/index.html`。`docs/CONVENTIONS.md` 第 13 节把这类照片详情页与七洲展厅同列为二级；仓库现状如此，不把它写成展厅的下级。

旧 AURA 总览已复制为 `halls/_legacy-aura.html` 存档，不再被引用。根 `index.html` 不再承载旧内容。

## 怎么打开

本地双击根 `index.html` 或 `globe/index.html` 即可。`file://` 已实测可开，页面不依赖远程 JSON，也不使用 `fetch()` 读索引。

需要 HTTP 环境时，在仓库根目录执行：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080/globe/`。

地球页需要 WebGL。未启用 WebGL 时页面会显示提示，并给出巴黎圣母院照片页的直达链接。

## 目录结构

```
ai-lab/
├── index.html              跳转壳，0 秒进入 globe/index.html
├── globe/                  一级总入口：地球、地标数据、贴图、建筑照片详情
│   ├── index.html          地球页面
│   ├── assets/             地球贴图、地标表、缩略图、素材来源记录
│   ├── notre-dame/         巴黎圣母院实拍照片详情（3 张 CC0）
│   └── kinkakuji/          金阁寺实拍分层页（2 张 CC0，在建）
├── halls/                  二级：七洲展厅
│   ├── index.html          七洲总览
│   ├── _shell/             七洲共享壳层（hall.css / hall.js / configs.js）
│   ├── eu/ as/ sa/ na/ af/ oc/ an/
│   └── _legacy-aura.html   旧 AURA 总览，仅存档
├── docs/
│   └── CONVENTIONS.md      目录、命名、入库、素材门槛的权威规范
├── cases/                  四类题面，只放 TASK.md，不放成品
├── results/                作品与元信息的唯一落盘处
│   ├── _TEMPLATE/          可复制空模板，不参与索引
│   └── _legacy/            旧作品迁移示例，不参与“新作品”统计
├── scripts/                校验与索引构建脚本
├── assets/                 旧 demo 共用的字体、样式、脚本（冻结）
├── web/ video/ deck/ game/ 旧 demo 四个门类页（冻结，不作为入口）
└── tools/                  旧本地预览与字体工具（冻结）
```

`web/`、`video/`、`deck/`、`game/` 是早期样例页，只保留历史与素材来源，不再新增内容，也不承担主入口职责。

## 作品怎么入库

唯一路径模板：

```
results/<model-slug>/<case-id>/v<NN>/
├── result.html     可离线打开的入口
├── preview.png     首屏预览，1440×900
├── prompt.md       原始提示词，逐字保存
└── meta.json       元信息
```

- `model-slug`：小写 ASCII 字母、数字与单个连字符，代表稳定产品线，不带版本号。
- `case-id`：`<cN>-<topic-slug>-<3 位序号>`，例如 `c1-editorial-001`。
- `vNN`：从 `v01` 起，只增不改；任何一次重跑都新建目录，禁止覆盖旧版。
- 四类能力：`c1` 网页、`c2` HTML PPT、`c3` HTML 短片、`c4` 游戏。
- 展厅门顺序不是 c1–c4：影像门是 c3，网页门是 c1，幻灯片门是 c2，游戏门是 c4。
- 入库判据：四件套齐全、`result.html` 双击可开、不依赖仓库外路径、`meta.json` 字段完整且与目录名一致、预览尺寸与体积达标、外链清单如实填写。
- 许可未定可填 `TBD`，但带 `TBD` 的作品不得合并进主线。
- 每个 `vNN/` 是独立完整版本，不引用上一版资源；差异写进 `meta.notes`。

完整字段、正则、体积上限与五问提交判据见 `docs/CONVENTIONS.md` 第 2–5 节，本文件不复述全文。

当前 `results/` 尚无正式入库作品，只有空模板与一条 `_legacy` 迁移示例。`scripts/` 尚未运行，因此也还没有生成 `results/index.json` 与 `results/index.js`；七洲展厅的作品卡片仍是界面样张，未接入作品索引。

## 素材与许可

自 2026-11-04 起，建筑照片与新增素材执行硬规矩：

- 只用许可可核验、来源可追溯的真实图片，例如公有领域、CC0、CC-BY。
- 许可要能回到写明条款的页面；“免费下载”不算许可。
- 来源页、直链、作者、获取日期都要记录；CC-BY 必须在页面署名，CC0 也要保留来源。
- 下载后必须打开看图，确认建筑与机位对得上，宽度不小于 1200 px；文件名和标题不算证据。
- 拿不到干净素材就留空，只保留地球点位，状态写 `planned`，卡片写“场景筹备中”。
- 不用自绘立面、AI 生成图或来源不明的拼图顶替实拍，也不把不同建筑、不同机位拼成一张。
- 唯一允许的降级是同一建筑单张实拍加调色模拟时刻，并在页面常显“模拟”。

逐图来源、许可、尺寸、字节、SHA-256 记在 `globe/assets/PHOTO-SOURCES.md`；逐地标可做 / 候选 / 不可做记在 `globe/assets/LANDMARK-AVAILABILITY.md`。

七洲展厅的外景与内景图是早期生成的本地样张，页面已标注为生成素材，不属于“实拍照片”口径，也不作为新增建筑内页的素材范例。

## 当前进度

- 七洲展厅：7 个洲页面与共享壳层已完成，共 28 道能力门、84 张界面样张；这些是界面演示，不是 `results/` 里的入库作品。
- 地球：总入口、17 个地标、环境面板、云层、雨雪粒子与按时刻联动的日照已完成；地球贴图为 NASA Blue Marble（公有领域），气象为程序化模拟，非实时。
- 巴黎圣母院：3 张 CC0 实拍已入库，照片详情页已上线；2.5D 分层视差改造进行中。`layered.html` 与 `classic.html` 作为历史版本保留，已撤出入口。
- 金阁寺：2 张 CC0 实拍（晴日池畔、雪日）已入库，实拍分层页在建，页内有四类能力标记。
- 作品库：尚无正式入库作品；只有 `_TEMPLATE` 与 `_legacy` 迁移示例。
- 校验脚本：`scripts/validate-results.mjs` 与 `scripts/build-index.mjs` 已写好；本机没有 `node`，两个脚本尚未实际运行过。
- 版本状态：工作只在 `trae/agent-0E5LWk` 分支，未合并 `main`；当前工作副本仍有未提交改动。

## 已知限制

- 外网图源大部分不可达：Wikimedia Commons、Pixabay、Pexels 在本网络下超时或 403；可实测使用的目前是 GoodFreePhotos 与 Pixnio。
- 17 个地标中，只有巴黎圣母院与金阁寺有内页；10 个是候选，尚未逐张下载核验；5 个没有干净素材，只有地球点位。
- 帧率读数来自无头或本机软件渲染，不是真机实测。
- 校验脚本尚未运行，索引文件尚未生成，展厅与作品库尚未接线。
- 地球依赖 WebGL；无 WebGL 时只能走照片页兜底，不能浏览地球。
- 所有照片页均为静态本地素材，不提供实时天气、实时客流或在线地图。

## 新增一件作品

1. 在 `cases/cN/TASK.md` 确认题面与 `case-id`，不要重复占用。
2. 复制 `results/_TEMPLATE/v01/` 到 `results/<model-slug>/<case-id>/v01/`。
3. 放入 `result.html`，先确认 `file://` 能打开，再截 `preview.png`（1440×900）。
4. 原样保存 `prompt.md`，填完 `meta.json`；许可未定写 `TBD`，但先不要合并。
5. 运行 `node scripts/validate-results.mjs`，通过后再运行 `node scripts/build-index.mjs`。

## 新增一个地标

1. 先按素材门槛找图，完成下载、看图、记录状态码 / 字节 / 耗时 / 尺寸 / SHA-256；没有干净素材就只加点位。
2. 在 `globe/assets/landmarks.js` 增加一条记录，填 `id`、`slug`、经纬度、`status`、`thumb`、简介与四类 `cases`。
3. 若 `status` 为 `open`，新建 `globe/<slug>/index.html` 与同目录 `assets/`，页内提供“← 地球”返回。
4. 缩略图放 `globe/assets/thumbs/`，并在页面与来源表中写清许可、来源与署名。
5. 更新 `globe/assets/PHOTO-SOURCES.md` 与 `globe/assets/LANDMARK-AVAILABILITY.md`，最后用 `file://` 实测。

## 参考

- 目录、命名与入库规范：`docs/CONVENTIONS.md`
- 图片许可与来源：`globe/assets/PHOTO-SOURCES.md`
- 地标可用性：`globe/assets/LANDMARK-AVAILABILITY.md`
- 题面：`cases/README.md`
