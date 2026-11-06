# AI LAB · 作品星图

零构建、零 CDN 依赖：`index.html` 一页承载星图 / 能力页 / 作品页，`work.html` 只做旧链接跳转。
所有资源走相对路径，**双击 `index.html` 即可打开**（无需起服务）。

> 本版全部素材为本地程序化生成的占位图，页面标注「样张 / PLACEHOLDER」。

---

## 打开

- 直接双击 `index.html`（`file://`）。`file://` 下 Chrome 禁止 fetch 本地 JSON，
  页面会自动改用 `data/index.js` 与各作品的 `work.js` 镜像，无需额外操作。
- 需要 http 时：`python3 -m http.server 8811`，打开 `http://localhost:8811/index.html`。

## 结构：能力 → 作品 → 版本

```
works/capabilities.json                     五根主干（image / video / web / ppt / game）
works/<capability>/<work-id>/work.json      作品元数据
works/<capability>/<work-id>/prompt-log.json  需求变更与提示词日志
works/<capability>/<work-id>/<version>/     版本素材 + prompt.json（版本名 YYYYMMDD）
data/index.json                             构建产物：聚合索引（页面只读它）
data/index.js  data/thumbs.js               上面两者的 file:// 镜像
works/<cap>/<id>/work.js                    单件作品的 file:// 数据包
dist/                                       导出产物（export_work.py）
backup/                                     迁移备份
```

星图对应三级：能力主干 → 作品短枝 → 版本叶。作品不再直接摆在主干上，一件作品一根短枝，
短枝按 `createdAt` 从根部往梢部排，版本叶按版本时间排在短枝外段，最新版在末梢。

URL 规则（均可冷启动直达）：

| URL | 内容 |
|---|---|
| `index.html#/` | 星图全景 |
| `index.html#/video` | 能力页 |
| `index.html#/video/video-html-001` | 作品页（默认最新版） |
| `index.html#/video/video-html-001/20261106` | 作品页（指定版本） |

`work.html?id=<work-id>[&v=<version>]` 是兼容旧链接的跳转壳，会重定向到上面的规范地址。

## 加一件作品

最少动 **3 个文件**，都在 `works/` 下，不需要改 HTML：

1. `works/<capability>/<id>/work.json` — 元数据（字段见 `docs/CONVENTIONS.md` 第 5.1 条）
2. `works/<capability>/<id>/prompt-log.json` — 首条 `initial` 记录
3. `works/<capability>/<id>/<version>/` — 素材（`thumb.jpg` + `01.jpg`… 或 `video.mp4` + `poster.jpg`）+ `prompt.json`

然后跑一次索引构建，星图 / 能力页 / 作品页 / hover 卡片都会自动出现：

```bash
python3 tools/build_index.py            # 写 data/index.json|index.js|thumbs.js 与各 work.js
python3 tools/build_index.py --check    # 只校验，不写盘
```

`data/` 与 `work.js` 都是生成物，不手改。

## 导出单件作品

```bash
python3 tools/export_work.py video-html-001              # 默认当前版本
python3 tools/export_work.py video-html-001 --version 20261106 --zip
python3 tools/export_work.py --all                       # 全部作品各导一份
```

产物 `dist/<id>-<version>/`：`index.html`（自包含、离线可用）、`assets/`、`work.json`、
`prompt-log.json`、`prompt.json`、`LICENSE.txt`。导出只读 `works/`，不回写。

## 版本与提示词

- 版本只在**用户说「定版」**时创建；平时修改直接覆盖当前版本文件，不升版本号。
- 被推翻的需求条目不删，只改 `status`（见 `docs/CONVENTIONS.md` 第 9 条）。
- 每个版本目录里的 `prompt.json` 保存该版实际提示词，作品页侧栏可对比版本。

## 验收脚本

`tools/verify.py` 连接已开启 DevTools 的无头 Chrome（端口 9555），统计 JS 报错、
网络字节、横向滚动并截图：

```bash
python3 tools/verify.py --url "file:///Users/.../index.html" --shot /tmp/i.png --wait 6
```

## 已知边界

- `file://` 下不能用 `fetch` 读 JSON、不能把本地图片当 WebGL 纹理，故有
  `data/index.js` / `data/thumbs.js` / `work.js` 三类镜像；改数据后务必重跑 `build_index.py`。
- 三方库版本成对锁定（three r124 ↔ 3d-force-graph 1.43.5），单独升级会白屏。
- 字体用系统字体（Didot / Songti / PingFang），`assets/fonts/` 仅作预留。
