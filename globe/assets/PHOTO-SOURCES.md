# 实拍底图来源与许可

记录日期：2026-11-04。本仓库只收「许可说得清 + 可实测下载」的图；聚合搜索页、公众号、小红书、知乎等来源一律不用。

## 结论

- 中国大陆网络下实测可下载、且许可明确为公共领域的图源：**GoodFreePhotos（CC0 / Public Domain）**、**Pixnio（CC0）**。
- Wikimedia Commons / upload.wikimedia.org：连接超时（12s / 9s），不可用。
- Pixabay、Pexels：站点 403，Pexels 图片 CDN 返回 404（网关提示 Source is unreachable），不可用。
- Unsplash：图片 CDN 可下（244,720 B），但站点接口 401，无法按许可检索到目标建筑；且已下载样图经核验为亚历山大三世桥，不采用。
- 百度/搜狗/360/Bing 中国/花瓣/站酷：页面可开，但图片版权归属不明或为付费图库/设计师作品，不采用；仅作检索线索。

## 入库图片

| 文件 | 建筑 / 取景 | 来源页 | 直链 | 许可 | 作者 | 尺寸 | 字节 | SHA-256 |
|---|---|---|---|---|---|---|---|---|
| `globe/notre-dame/assets/nd-front.jpg` | 巴黎圣母院，自左前方（西北）看西立面，左侧带入 Hôtel-Dieu 街景 | https://www.goodfreephotos.com/france/paris/notre-dame-cathedral-in-paris-france.jpg.php | https://www.goodfreephotos.com/albums/france/paris/notre-dame-cathedral-in-paris-france.jpg | CC0 / Public Domain（来源页原文：*This photo is under the CC0 / Public Domain License*） | 站点未标注作者；CC0 不要求署名 | 1280 × 1024 | 1,084,417（原图，下载耗时 39.3s）→ 入库重编码 274,422 | `d28f140b503abd40e76e2c86020ac3464f9674935c4af558160e0a7b38e23bb2` |

入库时仅做轻度对比度/饱和度 + JPEG 重编码（q84，progressive），未裁切、未合成、未拉伸。

## 已核实可继续使用、暂未入库

| 建筑 | 直链 | 许可 | 备注 |
|---|---|---|---|
| 巴黎圣母院 · 门廊雕像近景 | https://www.goodfreephotos.com/albums/france/paris/the-side-of-notre-dame-in-paris-france.jpg | CC0 | 2272 × 1704，可作细部层 |
| 巴黎圣母院 · 中殿内景 | https://www.goodfreephotos.com/albums/france/paris/inside-the-notre-dame-in-paris-france.jpg.php | CC0 | 可作「影像」内景层 |
| 金阁寺 · 晴日 | https://www.goodfreephotos.com/japan/kyoto/kinkaku-ji-kyoto-japan.jpg.php | CC0 | 亚洲园林类候选 |
| 金阁寺 · 雪日 | https://www.goodfreephotos.com/japan/kyoto/kinkaku-ji-in-the-winter-in-kyoto-japan.jpg.php | CC0 | 季节联动的现成多时段素材 |
| 金阁寺 · 池畔 | https://www.goodfreephotos.com/japan/kyoto/golden-pavilion-in-kyoto-japan.jpg.php | CC0 | 含倒影，适合作前景层 |

晋祠圣母殿、巴西利亚大教堂：上述干净图源均未命中；360/Bing 命中的中文站点图片许可不明，暂不自绘替换。

## 同一建筑多时段照片的选取口径

1. 机位一致优先：同一坐标、同一焦段、同一取景范围，仅时间不同；做不到时，至少保证正立面中线与地平线位置一致，便于交叉淡入。
2. 曝光一致优先：以晴日正午为基准，黄昏/夜景不做重度 HDR；宁可偏暗，保留石材质感。
3. 天气标签可判定：晴 / 阴 / 雨 / 雪各至少一张，且画面里能读到对应证据（湿反光、积雪、云层），不靠调色硬造。
4. 许可逐张可查：每张都能回到明确的 CC0/PD/CC-BY 条款页；缺任一张则该时段退回「单张 + 调色模拟」，并在页面标注「模拟」。
5. 目前巴黎圣母院仅拿到晴日一张，因此 dawn/day/dusk/night 仍为调色模拟（页面常显「模拟环境 · 非实时天气」），不做伪多时段合成。
