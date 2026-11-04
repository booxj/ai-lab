/* ============================================================
   地球入口 · 地标数据表
   新增一个地标 = 加一条记录 + 一套建筑场景目录（不改地球页代码）。
   字段：
     id        唯一标识，kebab-case，用于 DOM 与状态
     slug      场景目录名，对应 globe/<slug>/index.html
     country   国家（中文） / countryEn
     city      城市（中文） / cityEn
     name      建筑名（中文） / nameEn
     lat/lon   经纬度（十进制度，北纬/东经为正）
     status    open = 已建成场景；planned = 仅标记，尚未开放
     blurb     一句话概述（≤ 34 字）
     thumb     'notre-dame' / 'kinkakuji'，用于卡片缩略图（本地图片，非外链）
     cases     四类能力对应的 case-id（与 cases/c1..c4 的题面编号一致）
   ============================================================ */
window.LANDMARKS = {
  note: '已开放：巴黎圣母院、金阁寺。其余为标记点，状态 planned；无干净素材的地标只留点位，不做自绘替代。',
  items: [
    {
      id: 'notre-dame', slug: 'notre-dame',
      country: '法国', countryEn: 'FRANCE', city: '巴黎', cityEn: 'PARIS',
      name: '巴黎圣母院', nameEn: 'NOTRE-DAME DE PARIS',
      lat: 48.8530, lon: 2.3499, status: 'open', thumb: 'notre-dame',
      photo: 'notre-dame/assets/nd-front.jpg',
      photoCredit: '实拍 · GoodFreePhotos · CC0 公共领域',
      blurb: '西立面双塔、三连拱与玫瑰窗，哥特盛期的起点。',
      cases: {
        video: 'c3-notre-dame-film-001',
        web: 'c1-notre-dame-web-001',
        deck: 'c2-notre-dame-deck-001',
        game: 'c4-notre-dame-game-001'
      }
    },
    { id: 'kinkakuji', slug: 'kinkakuji', country: '日本', countryEn: 'JAPAN', city: '京都', cityEn: 'KYOTO',
      name: '金阁寺', nameEn: 'KINKAKU-JI', lat: 35.0394, lon: 135.7292, status: 'open', thumb: 'kinkakuji',
      photo: 'kinkakuji/assets/kj-pond.jpg',
      photoCredit: '实拍 · GoodFreePhotos · CC0 公共领域',
      blurb: '镜湖池畔的金箔楼阁，晴日与雪日两套实拍取景。',
      cases: {
        video: 'c3-kinkakuji-film-001',
        web: 'c1-kinkakuji-web-001',
        deck: 'c2-kinkakuji-deck-001',
        game: 'c4-kinkakuji-game-001'
      }
    },
    { id: 'sagrada', slug: 'sagrada', country: '西班牙', countryEn: 'SPAIN', city: '巴塞罗那', cityEn: 'BARCELONA',
      name: '圣家堂', nameEn: 'SAGRADA FAMÍLIA', lat: 41.4036, lon: 2.1744, status: 'planned',
      blurb: '高迪未完成的有机塔群，尖塔与曲面并存。' },
    { id: 'cologne', slug: 'cologne', country: '德国', countryEn: 'GERMANY', city: '科隆', cityEn: 'COLOGNE',
      name: '科隆大教堂', nameEn: 'KÖLNER DOM', lat: 50.9413, lon: 6.9583, status: 'planned',
      blurb: '双塔高耸入云，莱茵河畔的哥特巨构。' },
    { id: 'westminster', slug: 'westminster', country: '英国', countryEn: 'UK', city: '伦敦', cityEn: 'LONDON',
      name: '威敏寺', nameEn: 'WESTMINSTER ABBEY', lat: 51.4993, lon: -0.1273, status: 'planned',
      blurb: '英式哥特与王室加冕的石头编年史。' },
    { id: 'saint-basil', slug: 'saint-basil', country: '俄罗斯', countryEn: 'RUSSIA', city: '莫斯科', cityEn: 'MOSCOW',
      name: '圣瓦西里大教堂', nameEn: "ST. BASIL'S", lat: 55.7525, lon: 37.6231, status: 'planned',
      blurb: '九座洋葱穹顶，红场上的彩色剪影。' },
    { id: 'hagia-sophia', slug: 'hagia-sophia', country: '土耳其', countryEn: 'TÜRKİYE', city: '伊斯坦布尔', cityEn: 'ISTANBUL',
      name: '圣索菲亚', nameEn: 'HAGIA SOPHIA', lat: 41.0086, lon: 28.9802, status: 'planned',
      blurb: '巨穹与光，跨过两个帝国的界面。' },
    { id: 'taj-mahal', slug: 'taj-mahal', country: '印度', countryEn: 'INDIA', city: '阿格拉', cityEn: 'AGRA',
      name: '泰姬陵', nameEn: 'TAJ MAHAL', lat: 27.1751, lon: 78.0421, status: 'planned',
      blurb: '白色大理石的对称，倒影与晨雾。' },
    { id: 'kiyomizu', slug: 'kiyomizu', country: '日本', countryEn: 'JAPAN', city: '京都', cityEn: 'KYOTO',
      name: '清水寺', nameEn: 'KIYOMIZU-DERA', lat: 34.9949, lon: 135.7850, status: 'planned',
      blurb: '悬造舞台，春樱与秋枫之间的木构。' },
    { id: 'forbidden-city', slug: 'forbidden-city', country: '中国', countryEn: 'CHINA', city: '北京', cityEn: 'BEIJING',
      name: '紫禁城', nameEn: 'THE FORBIDDEN CITY', lat: 39.9163, lon: 116.3972, status: 'planned',
      blurb: '中轴、重檐与红墙，秩序即建筑。' },
    { id: 'giza', slug: 'giza', country: '埃及', countryEn: 'EGYPT', city: '吉萨', cityEn: 'GIZA',
      name: '吉萨金字塔', nameEn: 'PYRAMIDS OF GIZA', lat: 29.9792, lon: 31.1342, status: 'planned',
      blurb: '四千五百年的几何，沙漠里的第一束晨光。' },
    { id: 'liberty', slug: 'liberty', country: '美国', countryEn: 'USA', city: '纽约', cityEn: 'NEW YORK',
      name: '自由女神像', nameEn: 'STATUE OF LIBERTY', lat: 40.6892, lon: -74.0445, status: 'planned',
      blurb: '港湾入口的铜绿身影，火炬与雾。' },
    { id: 'machu-picchu', slug: 'machu-picchu', country: '秘鲁', countryEn: 'PERU', city: '库斯科', cityEn: 'CUSCO',
      name: '马丘比丘', nameEn: 'MACHU PICCHU', lat: -13.1631, lon: -72.5450, status: 'planned',
      blurb: '云线上的石墙，山脊与梯田。' },
    { id: 'christ-redeemer', slug: 'christ-redeemer', country: '巴西', countryEn: 'BRAZIL', city: '里约', cityEn: 'RIO',
      name: '基督像', nameEn: 'CHRIST THE REDEEMER', lat: -22.9519, lon: -43.2105, status: 'planned',
      blurb: '山顶张开的双臂，云海与海湾。' },
    { id: 'opera-house', slug: 'opera-house', country: '澳大利亚', countryEn: 'AUSTRALIA', city: '悉尼', cityEn: 'SYDNEY',
      name: '悉尼歌剧院', nameEn: 'SYDNEY OPERA HOUSE', lat: -33.8568, lon: 151.2153, status: 'planned',
      blurb: '壳片叠起的白帆，港湾的逆光。' },
    { id: 'moai', slug: 'moai', country: '智利', countryEn: 'CHILE', city: '复活节岛', cityEn: 'EASTER ISLAND',
      name: '摩艾石像', nameEn: 'MOAI', lat: -27.1127, lon: -109.3497, status: 'planned',
      blurb: '面向内陆的沉默面孔，海风与草坡。' },
    { id: 'ross-ice', slug: 'ross-ice', country: '南极洲', countryEn: 'ANTARCTICA', city: '罗斯冰架', cityEn: 'ROSS ICE SHELF',
      name: '南极观测站', nameEn: 'ANTARCTIC STATION', lat: -77.8460, lon: 166.6680, status: 'planned',
      blurb: '极昼与极夜之间的白色地平线。' }
  ]
};
