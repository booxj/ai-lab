# 素材与依赖来源（SOURCES）

格式：`文件或库 | 来源 | 许可 | 取得日期`

## 三方库（`vendor/`，每库仅一份）

| 文件 | 版本 | 来源 | 许可 | 取得日期 |
|---|---|---|---|---|
| `vendor/three.min.js` | r124 (0.124.0) | https://unpkg.com/three@0.124.0/build/three.min.js | MIT（见 `vendor/LICENSE-three.txt`） | 2026-11-05 |
| `vendor/3d-force-graph.min.js` | 1.43.5 | https://unpkg.com/3d-force-graph@1.43.5/dist/3d-force-graph.min.js | MIT（见 `vendor/LICENSE-3d-force-graph.txt`） | 2026-11-05 |

> 版本锁定说明：`3d-force-graph@1.43.5` 依赖 three r124 的 `Geometry.applyMatrix`，与 r149+ 不兼容，故 three 固定 r124，两者成对升级，不做单独升级。
> `openseadragon` 已随 DZI 方案一并移除（本版改为整图查看）。

## 图像与视频（全部本地程序化生成，无外部图库素材）

| 产物 | 生成方式 | 许可 | 生成日期 |
|---|---|---|---|
| `works/<cap>/<id>/<ver>/NN.jpg` | 程序化生成（numpy 向量场粒子 + PIL 合成，迁移前脚本） | 自有（程序生成） | 2026-11-05 |
| `works/<cap>/<id>/<ver>/thumb.jpg` | 从详情图中心裁切 640×400（迁移前脚本） | 自有（派生自程序生成图） | 2026-11-05 |
| `works/<cap>/<id>/<ver>/video.mp4` | `ffmpeg -f lavfi` 生成 6s 720p H.264 循环占位 | 自有（程序生成） | 2026-11-05 |
| `data/index.json` `data/index.js` `data/thumbs.js` `work.js` | `tools/build_index.py` 自动产出 | 自有 | 2026-11-06 |

> 占位素材的生成脚本（`build_placeholders.py` / `build_thumbs.py`）依赖迁移前的 `data/works.json`，已随迁移停用，副本存于 `backup/pre-migration-20261106/tools/`；新素材请直接写入版本目录。

## 演示稿素材（`works/ppt/ppt-html-001/`）

| 产物 | 来源 / 生成方式 | 许可 | 取得日期 |
|---|---|---|---|
| `20261110/index.html` | 自写 HTML/CSS/JS 版式（1280×720 画布等比缩放），文字与图形均为页面矢量元素；商务靛蓝配色（深底 `#0F1533` / 浅底 `#F3F5FA` / 强调 `#3F4F8C`） | 自有（程序生成） | 2026-11-10 |
| `20261110/thumb.jpg` | 封面页 1600×900 渲染图裁切为 640×400 | 自有（程序生成） | 2026-11-10 |
| `20261110/assets/trae-ui.png`、`workbuddy-ui.png` | 用户提供，原文件位于 `~/Documents/Trae-CN/ui-compare/`，源自飞书文档 | 自有（用户提供） | 2026-11-10 |
| `20261110/assets/night-token.jpg` | 飞书文档内图片下载（file_token `Mke0bY6iboGfKUxGbUBcpRbDnnc`） | 自有（文档素材） | 2026-11-10 |

> 文字内容全部取自飞书文档《办公类 Agent 使用技巧（Trae）》（`jb6epactfg.feishu.cn/docx/QTPndwbjnoUGlUxsuifc6BYxnmg`），未补充文档以外的结论；`index.html` 即演示入口，三张图片走同目录相对路径，不引用任何外网资源。

## 字体

页面使用系统字体（Didot / Songti SC / PingFang SC / Helvetica Neue），不随包分发，不涉及字体授权。`assets/fonts/` 为空目录，仅作后续自托管预留。

## 未使用的外部资源

本版**没有**引用任何 CDN、图库照片、Icon 字体或在线字体；所有页面资源均为仓库内相对路径。
