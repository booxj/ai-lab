# 实拍底图来源与许可

记录日期：2026-11-04。本仓库只收「许可说得清 + 可实测下载 + 看图和建筑对得上」的图；聚合搜索页、公众号、小红书、知乎等来源一律不用。

---

## 0. 素材门槛（长期规则，对所有建筑生效）

> **只有在拿到许可干净（CC0 / 公有领域 / 明确免费商用且可署名）的真实素材后才做内页；没有干净素材的地标只保留地球上的点位，不做自绘替代、不做来源不明的拼凑。**

### 0.1 判定标准（四条全过才算「可用」）

1. **许可可核验**：每张图都能回到写明许可条款的页面（CC0 / Public Domain / CC-BY 等），把原文摘录留档；页面上只写「免费下载」不算。
2. **来源可追溯**：来源页 URL、图片直链、作者（如站点标注）、获取日期，四样都能写出来。
3. **来源类型受限**：不得来自聚合搜索页（百度 / 搜狗 / 360 / Bing 图片流）、公众号、小红书、微博、知乎、花瓣、站酷、付费图库。这些只能当检索线索，不能当素材来源。
4. **内容与建筑可核对**：下载后必须打开看图，确认拍的是这座建筑、机位与构图可用、宽度 ≥ 1200 px。文件名或标题不算证据（曾把亚历山大三世桥当成巴黎圣母院）。

### 0.2 素材不足时的处理

- 该地标只保留地球上的点位与卡片，`status` 保持 `planned`，卡片显示「标记已登记 · 场景筹备中」。
- **不画替代建筑、不用 AI 生成图冒充实拍、不把不同建筑或不同机位的照片拼成一张。**
- 唯一允许的降级：同一建筑的单张实拍 + 调色模拟时刻，并在页面上常显「模拟」。

### 0.3 「候选」不等于「可用」

站点目录里出现条目，只能证明**疑似存在**，不证明许可干净、也不证明内容对得上。候选必须走完「下载（记状态码 / 字节数 / 耗时）→ 打开看图 → 记录 SHA-256 与尺寸」才算可用；未走完的一律写「候选 · 未验证」。逐地标状态见 [LANDMARK-AVAILABILITY.md](LANDMARK-AVAILABILITY.md)。

### 0.4 每张图的记录格式

| 文件 | 建筑 / 取景 | 来源页 | 直链 | 许可 | 作者 | 尺寸 | 字节 | SHA-256 |
|---|---|---|---|---|---|---|---|---|

---

## 1. 图源实测结论（中国大陆网络，2026-11-04）

- 实测可下载、许可明确为公共领域的图源：**GoodFreePhotos（CC0 / Public Domain）**、**Pixnio（CC0）**。
- Wikimedia Commons / upload.wikimedia.org：连接超时（12 s / 9 s），不可用。
- Pixabay、Pexels：站点 403，Pexels 图片 CDN 返回 404（网关提示 Source is unreachable），不可用。
- Unsplash：图片 CDN 可下（244,720 B），但站点接口 401，无法按许可检索到目标建筑；样图经核验为亚历山大三世桥，不采用。
- 百度 / 搜狗 / 360 / Bing 中国 / 花瓣 / 站酷：页面可开，但版权归属不明或为付费图库，不采用；仅作检索线索。
- GoodFreePhotos 站内没有搜索接口（`/search?q=` 返回 404，7,169 B，1.2 s），只能按「国家 / 城市」目录逐层检索。

---

## 2. 入库图片

| 文件 | 建筑 / 取景 | 来源页 | 直链 | 许可 | 作者 | 尺寸 | 字节 | SHA-256 |
|---|---|---|---|---|---|---|---|---|
| `globe/notre-dame/assets/nd-front.jpg` | 巴黎圣母院，自左前方（西北）看西立面，左侧带入 Hôtel-Dieu 街景 | https://www.goodfreephotos.com/france/paris/notre-dame-cathedral-in-paris-france.jpg.php | https://www.goodfreephotos.com/albums/france/paris/notre-dame-cathedral-in-paris-france.jpg | CC0 / Public Domain（来源页原文：*This photo is under the CC0 / Public Domain License*） | 站点未标注作者；CC0 不要求署名 | 1280 × 1024 | 1,084,417（原图，下载耗时 39.3 s）→ 入库重编码 274,422 | `d28f140b503abd40e76e2c86020ac3464f9674935c4af558160e0a7b38e23bb2` |
| `globe/kinkakuji/assets/kj-pond.jpg` | 金阁寺（鹿苑寺）镜湖池，自池东南岸看金阁，楼阁居中、前景水面与倒影 | https://www.goodfreephotos.com/japan/kyoto/golden-pavilion-in-kyoto-japan.jpg.php | https://www.goodfreephotos.com/albums/japan/kyoto/golden-pavilion-in-kyoto-japan.jpg | CC0 / Public Domain | 站点未标注作者 | 2500 × 1788 | 1,929,973（原图，下载 62.24 s）→ 等比缩至 1200 × 858，入库 280,273 | `0e114c66bb75248a7c106e482dae37185ac4ddde907de296f93cb4c1c5c87c22` |
| `globe/kinkakuji/assets/kj-snow.jpg` | 金阁寺雪日，自池西岸看金阁，屋面与池畔石组积雪，前景落雪 | https://www.goodfreephotos.com/japan/kyoto/kinkaku-ji-in-the-winter-in-kyoto-japan.jpg.php | https://www.goodfreephotos.com/albums/japan/kyoto/kinkaku-ji-in-the-winter-in-kyoto-japan.jpg | CC0 / Public Domain | 站点未标注作者 | 2893 × 1920 | 2,616,233（原图，55.73 s）→ 等比缩至 1200 × 796，入库 285,373 | `fa9d9a4889ae4272ace717150ce4af4869da16ec211ffa6e54055fb6e171ba5d` |
| `globe/assets/thumbs/kinkakuji.jpg` | 地球页卡片缩略图（由上表 `kj-pond.jpg` 原图裁 2.3:1 横幅，含楼阁与池面） | 同上 | 同上 | CC0 / Public Domain | 同上 | 760 × 330 | 69,456 | `0288ecb80c5d2334115838c98624d37e05a2c1cc32c2197adc325e4415c37d70` |

入库处理口径：`nd-front.jpg` 仅轻度对比度/饱和度 + JPEG 重编码；两张金阁寺为**等比缩图 + JPEG 重编码，未裁切、未拉伸、未合成**（缩略图是唯一例外，且只用于 300 px 级卡片）。

---

## 3. 已核实可继续使用、暂未入库

| 建筑 | 直链 | 许可 | 备注 |
|---|---|---|---|
| 巴黎圣母院 · 门廊雕像近景 | https://www.goodfreephotos.com/albums/france/paris/the-side-of-notre-dame-in-paris-france.jpg | CC0 | 2272 × 1704，可作细部层 |
| 巴黎圣母院 · 中殿内景 | https://www.goodfreephotos.com/albums/france/paris/inside-the-notre-dame-in-paris-france.jpg.php | CC0 | 可作「影像」内景层 |
| 金阁寺 · 楼阁近景 | https://www.goodfreephotos.com/albums/japan/kyoto/kinkaku-ji-kyoto-japan.jpg | CC0 | 2125 × 1489，1,723,314 B / 48.07 s；机位比池畔更近，可作推近层备选 |

---

## 4. 本轮下载实测证据（2026-11-04）

| 请求 | 状态码 | 字节 | 耗时 | 备注 |
|---|---|---|---|---|
| `albums/japan/kyoto/golden-pavilion-in-kyoto-japan.jpg` | 200 | 1,929,973 | 62.24 s | 入库为 `kj-pond.jpg` |
| `albums/japan/kyoto/kinkaku-ji-in-the-winter-in-kyoto-japan.jpg` | 200 | 2,616,233 | 55.73 s | 入库为 `kj-snow.jpg` |
| `albums/japan/kyoto/kinkaku-ji-kyoto-japan.jpg` | 200 | 1,723,314 | 48.07 s | 已看图核对，暂未入库 |

三张均打开看图确认：楼阁形制、池面、樹木与金阁寺一致，无「标题对、图不对」情况。

---

## 5. GoodFreePhotos 目录探测记录（用于地标可用性清单）

均为 `curl -L` 实测；目录页即该城市/国家的图片列表页。**目录里有条目 ≠ 可用**，只是「候选」。

| 目录 | 状态码 | 字节 | 耗时 | 与本仓库地标的关系 |
|---|---|---|---|---|
| `/japan/kyoto/` | 200 | 19,993 | 1.54 s | 有 kinkaku-ji / golden-pavilion（已入库）；无清水寺 |
| `/spain/barcelona/` | 200 | 21,815 | 2.30 s | 有 `sagrada-family-church-in-barcelona-spain`（候选） |
| `/germany/cologne/` | 200 | 18,009 | 1.33 s | 有 `kolner-dom-in-cologne-germany`、`cathedral-in-cologne-germany`（候选） |
| `/russia/moscow/` | 200 | 21,014 | 1.17 s | 有 `russian-basilica-in-moscow-russia`（候选） |
| `/turkey/istanbul/` | 200 | 22,908 | 1.51 s | 有 `the-hagia-sophia-as-a-mosque-in-istanbul-turkey` 等（候选） |
| `/india/other/` | 200 | 23,366 | 2.03 s | 有 `frontal-view-of-the-taj-mahal-india`、1890 历史照（候选） |
| `/egypt/giza/` | 200 | 19,102 | 1.38 s | 金字塔与狮身人面像多张（候选） |
| `/peru/machu-picchu/` | 200 | 22,933 | 1.43 s | 20 张条目（候选） |
| `/brazil/rio-de-janeiro/` | 200 | 21,775 | 1.31 s | 有 `cristo-redentor-...`、日落基督像（候选） |
| `/chile/easter-island/` | 200 | 17,855 | 3.15 s | 有 `moai-statues-easter-island-chile` 等（候选） |
| `/antarctica/` | 200 | 21,668 | 2.14 s | 有 McMurdo 站、Amundsen-Scott 站（候选，对应 ross-ice 点位） |
| `/england/london/` | 200 | 21,449 | 1.37 s | 无 Westminster Abbey 条目 |
| `/australia/new-south-wales/` | 200 | 14,272 | 1.50 s | 无悉尼歌剧院条目 |
| `/china/bejing/` | 200 | 21,977 | 1.73 s | 只有雍和宫/寺庙类，无紫禁城 |
| `/united-states/new-york/` | 200 | 15,775 | 1.51 s | 未检出自由女神条目 |
| `/india/agra/` | 404 | 7,169 | 0.91 s | 无该城市目录（泰姬陵改由 `/india/other/` 命中） |
| `/peru/cusco/` | 404 | 7,169 | 1.24 s | 无该城市目录（马丘比丘由 `/peru/machu-picchu/` 命中） |
| `/uk/london/`、`/great-britain/london/` | 404 | 7,169 | 0.88–0.92 s | 国家目录名不是 uk / great-britain |
| `/china/beijing/`、`/usa/new-york/`、`/australia/sydney/` | 404 | 7,169 | 0.86–0.88 s | 城市 slug 拼写不符（北京站内写作 `bejing`） |

结论：GoodFreePhotos 仍是本轮唯一「可实测、许可干净」的图源；候选条目增多说明**素材门槛不是「没素材」**，而是「还没逐张核验」。

---

## 6. 同一建筑多时段照片的选取口径

1. 机位一致优先：同一坐标、同一焦段、同一取景范围，仅时间不同；做不到时，至少保证正立面中线与地平线位置一致，便于交叉淡入。
2. 曝光一致优先：以晴日正午为基准，黄昏/夜景不做重度 HDR；宁可偏暗，保留材质质感。
3. 天气标签可判定：晴 / 阴 / 雨 / 雪各至少一张，且画面里能读到对应证据（湿反光、积雪、云层），不靠调色硬造。
4. 许可逐张可查：每张都能回到明确的 CC0/PD/CC-BY 条款页；缺任一张则该时段退回「单张 + 调色模拟」，并在页面标注「模拟」。
5. 承认机位差异：金阁寺晴日与雪日为两个机位，因此页面不做「同一画面逐帧换天」，而是**两套独立取景 + 交叉淡入**，题签坐标各随取景一套。

---

## 7. 相关文档

- 地标可用 / 不可用清单：[LANDMARK-AVAILABILITY.md](LANDMARK-AVAILABILITY.md)
- 目录与作品收录规范：[../../docs/CONVENTIONS.md](../../docs/CONVENTIONS.md)（第 11 节引用本节）
