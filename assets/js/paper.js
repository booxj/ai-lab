/* ===========================================================
   PAPER — 纸境：3D 卡片轨道 + 真实 iframe 缩略渲染
   =========================================================== */

/* ---------- 迷你站点（AI 生成的网页成果，以 srcdoc 真实渲染） ---------- */
const MINI = {
  atlas: `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#0d1117;color:#e6edf3}
  .nav{display:flex;justify-content:space-between;align-items:center;padding:28px 48px;border-bottom:1px solid #21262d}
  .logo{font-weight:800;letter-spacing:-.02em;font-size:20px}
  .logo i{color:#f0883e;font-style:normal}
  .nav a{color:#8b949e;text-decoration:none;font-size:13px;margin-left:26px}
  .hero{padding:70px 48px 40px}
  .tag{display:inline-block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#f0883e;border:1px solid rgba(240,136,62,.4);padding:5px 11px;border-radius:99px;margin-bottom:26px}
  h1{font-size:62px;line-height:1.02;letter-spacing:-.03em;max-width:15ch;font-weight:700}
  h1 span{color:#f0883e}
  .p{margin-top:22px;color:#8b949e;font-size:16px;max-width:46ch;line-height:1.7}
  .btn{display:inline-block;margin-top:32px;background:#f0883e;color:#11151c;font-weight:700;font-size:14px;padding:14px 26px;border-radius:8px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding:20px 48px 60px}
  .cardx{border:1px solid #21262d;border-radius:12px;padding:24px;background:#11161d}
  .cardx h4{font-size:15px;margin-bottom:8px}
  .cardx p{font-size:13px;color:#7d8590;line-height:1.6}
  .cardx .bar{height:4px;background:#21262d;border-radius:99px;margin-top:18px;overflow:hidden}
  .cardx .bar i{display:block;height:100%;background:linear-gradient(90deg,#f0883e,#e2b04a)}
  </style></head><body>
  <div class="nav"><div class="logo">A<i>t</i>las</div><div><a>产品</a><a>方案</a><a>文档</a><a>定价</a></div></div>
  <div class="hero"><div class="tag">AI 基础设施</div>
  <h1>把数据变成<span>决策</span>的速度</h1>
  <p>Atlas 将分散在业务系统中的指标聚合为可查询的语义层，让每一位分析师都能在十秒内得到答案。</p>
  <div class="btn">免费开始使用 →</div></div>
  <div class="grid">
  <div class="cardx"><h4>语义层建模</h4><p>用自然语言定义指标口径，自动同步到所有查询引擎。</p><div class="bar"><i style="width:78%"></i></div></div>
  <div class="cardx"><h4>异常归因</h4><p>指标波动时自动列出可能原因与影响范围。</p><div class="bar"><i style="width:54%"></i></div></div>
  <div class="cardx"><h4>协作白板</h4><p>结论即文档，讨论留在数据旁边。</p><div class="bar"><i style="width:91%"></i></div></div>
  </div></body></html>`,

  bloom: `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,serif;background:#faf7f2;color:#1a1a1a}
  header{padding:34px 56px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5ded2}
  .w{font-size:26px;font-style:italic;letter-spacing:-.01em}
  .nav{font-size:13px;color:#7a7269}
  .nav span{margin-left:24px}
  .cover{padding:80px 56px 50px;display:grid;grid-template-columns:1.4fr 1fr;gap:50px;align-items:end}
  .issue{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#b4472f;margin-bottom:20px}
  h1{font-size:70px;line-height:.98;letter-spacing:-.025em;font-weight:400}
  h1 em{font-style:italic;color:#b4472f}
  .meta{font-size:14px;color:#6d655c;line-height:1.9;border-left:1px solid #e5ded2;padding-left:24px}
  .art{height:360px;background:linear-gradient(135deg,#e8dcc6,#d8c3a5 40%,#c9a888);position:relative;overflow:hidden}
  .art::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 70% 30%,rgba(255,255,255,.55),transparent 55%)}
  .grid2{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid #e5ded2;margin-top:50px}
  .col{padding:34px 30px;border-right:1px solid #e5ded2}
  .col:last-child{border-right:0}
  .col .n{font-size:11px;color:#b4472f;letter-spacing:.2em}
  .col h3{font-size:26px;line-height:1.2;margin:14px 0 10px;font-weight:400}
  .col p{font-size:13.5px;color:#6d655c;line-height:1.75}
  </style></head><body>
  <header><div class="w">Bloom Quarterly</div><div class="nav"><span>Essay</span><span>Interview</span><span>Archive</span></div></header>
  <div class="cover"><div><div class="issue">Issue 14 — 合成与真实</div>
  <h1>当机器开始<em>做梦</em>，谁来替我们醒来</h1></div>
  <div class="meta">一本关于创作、技术与<br>不确定性的季刊<br>2026 春季号 · 128 页</div></div>
  <div class="art"></div>
  <div class="grid2">
  <div class="col"><div class="n">01</div><h3>生成式绘画的十年</h3><p>从噪声到风格，工具链的更迭如何重塑一位画家的日常。</p></div>
  <div class="col"><div class="n">02</div><h3>在会议室里养一个模型</h3><p>企业内部的智能体，正在接管哪些真正重要的工作。</p></div>
  <div class="col"><div class="n">03</div><h3>纸上的机器</h3><p>我们如何把一首诗写进一块硅片，又把它读回来。</p></div>
  </div></body></html>`,

  terra: `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Avenir Next','Segoe UI',sans-serif;background:#efe9df;color:#2c2a26}
  .split{display:grid;grid-template-columns:1fr 1fr;min-height:100vh}
  .photo{background:linear-gradient(160deg,#6b7f5e,#3f4d38 55%,#2a3325);position:relative;overflow:hidden}
  .photo::before{content:"";position:absolute;inset:0;background:
     radial-gradient(ellipse at 30% 20%,rgba(226,219,160,.45),transparent 45%),
     radial-gradient(ellipse at 75% 75%,rgba(30,40,25,.7),transparent 55%)}
  .photo span{position:absolute;bottom:30px;left:34px;color:rgba(255,255,255,.62);font-size:12px;letter-spacing:.2em}
  .panel{padding:70px 64px;display:flex;flex-direction:column;justify-content:space-between}
  .brand{font-size:22px;letter-spacing:.3em;text-transform:uppercase}
  h1{font-size:58px;line-height:1.02;font-weight:400;margin:34px 0 20px;letter-spacing:-.02em}
  p{color:#6f685d;line-height:1.9;font-size:15px;max-width:40ch}
  .facts{margin-top:40px;display:grid;gap:0}
  .facts div{display:flex;justify-content:space-between;padding:15px 0;border-top:1px solid #d8d0c2;font-size:13.5px}
  .facts div span:last-child{color:#6f685d}
  .cta{margin-top:38px;display:inline-block;padding:15px 34px;background:#2c2a26;color:#efe9df;border-radius:99px;font-size:13px;letter-spacing:.1em}
  </style></head><body>
  <div class="split"><div class="photo"><span>FIELD NOTE 07 — YUNLING</span></div>
  <div class="panel"><div>
  <div class="brand">Terra</div>
  <h1>从一粒种子<br>到一杯茶</h1>
  <p>我们只用一座山、一场雨和四十七天。不催熟，不修饰，喝到的都是时间本身。</p>
  <div class="facts"><div><span>产地</span><span>云南 · 云岭</span></div>
  <div><span>海拔</span><span>1860 m</span></div><div><span>品种</span><span>云抗 10 号</span></div>
  <div><span>工艺</span><span>日晒 · 手工分级</span></div></div></div>
  <div class="cta">领取本季茶单 →</div></div></div></body></html>`,

  orbit: `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#05070f;color:#cfe6ff}
  .wrap{padding:26px 32px;display:flex;flex-direction:column;height:100vh}
  .bar{display:flex;justify-content:space-between;font-size:12px;color:#5f7fa8;border-bottom:1px solid #14203a;padding-bottom:14px}
  .main{flex:1;display:grid;grid-template-columns:1.4fr 1fr;gap:22px;padding:22px 0}
  .panelx{border:1px solid #14203a;border-radius:10px;padding:22px;background:#0a1020}
  .k{font-size:10.5px;letter-spacing:.2em;color:#3fa9f5;text-transform:uppercase}
  .big{font-size:42px;margin:14px 0 4px;letter-spacing:-.02em}
  .sub{color:#5f7fa8;font-size:12.5px}
  .row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #0e1730;font-size:12.5px}
  .row span:last-child{color:#8fdcff}
  .spark{height:120px;margin-top:20px;display:flex;align-items:flex-end;gap:5px}
  .spark i{flex:1;background:linear-gradient(180deg,#3fa9f5,#1b4a86);border-radius:2px 2px 0 0}
  .orb{width:150px;height:150px;border-radius:50%;margin:26px auto;background:radial-gradient(circle at 32% 30%,#7fd8ff,#2b6fd0 45%,#0b1b3a);box-shadow:0 0 70px rgba(63,169,245,.45)}
  .btn{margin-top:14px;display:block;text-align:center;padding:12px;border:1px solid #1e3a63;border-radius:8px;color:#8fdcff;font-size:12px}
  </style></head><body>
  <div class="wrap"><div class="bar"><div>ORBIT / TELEMETRY</div><div>LINK ● STABLE · 42ms</div></div>
  <div class="main"><div>
    <div class="panelx"><div class="k">Active nodes</div><div class="big">128</div><div class="sub">across 6 regions · 99.98% uptime</div>
    <div class="spark"><i style="height:38%"></i><i style="height:52%"></i><i style="height:44%"></i><i style="height:70%"></i><i style="height:61%"></i><i style="height:88%"></i><i style="height:73%"></i><i style="height:95%"></i><i style="height:81%"></i><i style="height:100%"></i><i style="height:92%"></i><i style="height:86%"></i></div></div>
    <div class="panelx" style="margin-top:22px"><div class="k">Throughput</div>
    <div class="row"><span>requests / s</span><span>48,201</span></div>
    <div class="row"><span>p99 latency</span><span>42 ms</span></div>
    <div class="row"><span>cache hit</span><span>94.6 %</span></div>
    <div class="row"><span>errors</span><span>0.004 %</span></div></div>
    </div>
    <div class="panelx"><div class="k">Cluster health</div><div class="orb"></div>
    <div class="sub" style="text-align:center">node-07 · core<br>load 41% · temp 38°C</div>
    <div class="btn">REBALANCE</div></div>
  </div></div></body></html>`,

  kiln: `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Trebuchet MS',sans-serif;background:#1b1b1f;color:#f2ede4}
  .hd{padding:26px 44px;border-bottom:1px solid #33333a;display:flex;align-items:center;gap:40px}
  .hd .m{font-size:24px;font-weight:700;letter-spacing:.1em;color:#e8622c}
  .hd nav a{color:#a09aa0;font-size:13px;text-decoration:none;margin-right:26px}
  .hero{padding:66px 44px 20px;display:flex;justify-content:space-between;align-items:flex-end;gap:30px}
  h1{font-size:66px;line-height:.95;letter-spacing:-.03em;font-weight:800}
  h1 u{text-decoration:none;color:#e8622c}
  .price{text-align:right}
  .price .p{font-size:44px;font-weight:800}
  .price .p small{font-size:15px;color:#a09aa0;font-weight:400}
  .cardset{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:40px 44px}
  .pc{border:1px solid #33333a;border-radius:16px;padding:30px 26px;background:#232329;position:relative;overflow:hidden}
  .pc.hot{border-color:#e8622c;background:#2a211f}
  .pc.hot::after{content:"POPULAR";position:absolute;top:14px;right:-32px;background:#e8622c;color:#1b1b1f;font-size:10px;letter-spacing:.16em;padding:5px 36px;transform:rotate(38deg)}
  .pc h3{font-size:22px;margin-bottom:6px}
  .pc .desc{color:#a09aa0;font-size:13px;line-height:1.7;min-height:44px}
  .pc ul{list-style:none;margin:22px 0 26px}
  .pc li{padding:10px 0;border-top:1px solid #33333a;font-size:13px;color:#cdc7cf}
  .pc li b{color:#f2ede4}
  .go{display:block;text-align:center;padding:13px;border-radius:10px;background:#e8622c;color:#1b1b1f;font-weight:700;font-size:14px}
  .pc:not(.hot) .go{background:#33333a;color:#f2ede4}
  .ft{padding:26px 44px;border-top:1px solid #33333a;color:#6e6a72;font-size:12px;display:flex;justify-content:space-between}
  </style></head><body>
  <div class="hd"><div class="m">KILN°</div><nav><a>产品</a><a>方案</a><a>开发者</a><a>定价</a></nav></div>
  <div class="hero"><h1>把想法<br>放进<u>窑里</u></h1>
  <div class="price"><div class="p">￥0<small> / 起</small></div><div style="color:#a09aa0;font-size:13px;margin-top:6px">免费额度持续 30 天</div></div></div>
  <div class="cardset">
  <div class="pc"><h3>Starter</h3><div class="desc">适合刚起步的小团队</div><ul><li>3 个项目</li><li>每日 <b>1,000</b> 次构建</li><li>社区支持</li></ul><div class="go">开始使用</div></div>
  <div class="pc hot"><h3>Studio</h3><div class="desc">为需要稳定产出的团队设计</div><ul><li>不限项目</li><li>每日 <b>50,000</b> 次构建</li><li>自定义域名</li><li>优先队列</li></ul><div class="go">试用 14 天</div></div>
  <div class="pc"><h3>Foundry</h3><div class="desc">面向企业与私有部署</div><ul><li>独立集群</li><li>SLA <b>99.99%</b></li><li>专属支持</li></ul><div class="go">联系我们</div></div>
  </div>
  <div class="ft"><span>© 2026 Kiln Studio</span><span>服务条款 · 隐私 · 状态页</span></div>
  </body></html>`,

  lume: `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Helvetica Neue',Arial;background:#f7f9fb;color:#0f172a}
  .nav{display:flex;justify-content:space-between;align-items:center;padding:22px 44px;background:#fff;border-bottom:1px solid #e6ebf2}
  .nav .l{font-weight:800;font-size:19px;letter-spacing:-.02em}
  .nav .l span{color:#4f46e5}
  .search{border:1px solid #e6ebf2;border-radius:99px;padding:9px 18px;color:#94a3b8;font-size:13px;width:260px}
  .layout{display:grid;grid-template-columns:200px 1fr 280px;gap:26px;padding:30px 44px}
  .side h5{font-size:10.5px;letter-spacing:.18em;color:#94a3b8;text-transform:uppercase;margin-bottom:14px}
  .side a{display:block;padding:9px 0;font-size:13.5px;color:#475569;border-bottom:1px solid #eef2f7}
  .side a.on{color:#4f46e5;font-weight:600}
  .item{display:grid;grid-template-columns:96px 1fr;gap:20px;padding:22px 0;border-bottom:1px solid #eef2f7}
  .th{height:74px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#22d3ee)}
  .t2{background:linear-gradient(135deg,#f59e0b,#ef4444)}
  .t3{background:linear-gradient(135deg,#10b981,#065f46)}
  .t4{background:linear-gradient(135deg,#a855f7,#4f46e5)}
  .item h4{font-size:17px;margin-bottom:6px}
  .item p{font-size:13px;color:#64748b;line-height:1.65}
  .meta{margin-top:9px;font-size:11.5px;color:#94a3b8;display:flex;gap:14px}
  .hot{border:1px solid #e6ebf2;border-radius:14px;padding:22px;background:#fff}
  .hot h5{font-size:13px;margin-bottom:16px}
  .hot .tag{display:inline-block;background:#eef2ff;color:#4f46e5;font-size:11px;padding:4px 9px;border-radius:5px;margin:3px}
  .score{font-size:44px;font-weight:800;letter-spacing:-.03em}
  .score small{font-size:13px;color:#94a3b8;font-weight:400}
  </style></head><body>
  <div class="nav"><div class="l">Lume<span>.</span></div><div class="search">搜索作品、作者、标签…</div></div>
  <div class="layout"><div class="side"><h5>探索</h5><a class="on">推荐</a><a>最新</a><a>趋势</a><a>合集</a>
  <h5 style="margin-top:28px">类型</h5><a>网站</a><a>视觉</a><a>交互</a><a>工具</a></div>
  <div><div class="item"><div class="th"></div><div><h4>微光 — 一份关于光的档案</h4><p>用时间轴与光影重构的摄影集，滚动即是一次日落。</p><div class="meta"><span>2.4k 收藏</span><span>WebGL</span></div></div></div>
  <div class="item"><div class="th t2"></div><div><h4>回声广场</h4><p>把城市声音可视化的实时地图，每一格都是一段被拾起的白噪音。</p><div class="meta"><span>1.8k 收藏</span><span>Audio</span></div></div></div>
  <div class="item"><div class="th t3"></div><div><h4>Roots — 根系生长模拟</h4><p>基于 L-system 的植物生长模拟器，可导出为动画序列。</p><div class="meta"><span>3.1k 收藏</span><span>Canvas</span></div></div></div>
  <div class="item"><div class="th t4"></div><div><h4>VOID — 虚空剧场</h4><p>第一人称的抽象空间漫游，无目标，只有形状与光。</p><div class="meta"><span>980 收藏</span><span>WebXR</span></div></div></div></div>
  <div class="hot"><h5>今日热门标签</h5><span class="tag">生成式</span><span class="tag">排版</span><span class="tag">3D</span><span class="tag">声音</span><span class="tag">极简</span><span class="tag">实验</span>
  <h5 style="margin-top:26px">今日浏览</h5><div class="score">24,871<small> 次</small></div>
  <div style="font-size:12px;color:#94a3b8;margin-top:6px">较昨日 +12.4%</div></div>
  </div></body></html>`,
};

const ITEMS = [
  { id: 'atlas', idx: '01', title: 'Atlas', desc: 'AI 数据平台 · 落地页 / 定价页', tags: ['SaaS', 'Dark', 'Marketing'], theme: 'atlas' },
  { id: 'bloom', idx: '02', title: 'Bloom Quarterly', desc: '独立季刊 · 内容型门户', tags: ['Editorial', 'Serif'], theme: 'bloom' },
  { id: 'terra', idx: '03', title: 'Terra', desc: '农产品品牌 · 沉浸式首页', tags: ['Brand', 'Photo'], theme: 'terra' },
  { id: 'orbit', idx: '04', title: 'Orbit', desc: '可观测性后台 · 数据面板', tags: ['Dashboard', 'Terminal'], theme: 'orbit' },
  { id: 'kiln', idx: '05', title: 'Kiln', desc: '云构建平台 · 定价对比', tags: ['Pricing', 'Product'], theme: 'kiln' },
  { id: 'lume', idx: '06', title: 'Lume', desc: '作品社区 · 三栏信息流', tags: ['Community', 'Feed'], theme: 'lume' },
];

/* ---------- 轨道状态 ---------- */
const rail = {
  el: null, cards: [], index: 0, offset: 0, target: 0, dragging: false,
  startX: 0, startOffset: 0, moved: 0, radius: 520,
};
const STEP = () => 360 / ITEMS.length;

function buildRail() {
  rail.el = document.querySelector('.rail');
  const wrap = document.querySelector('.paper-rail-wrap');
  rail.cards = ITEMS.map((it, i) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-frame">
        <iframe title="${it.title}" loading="lazy" sandbox="allow-same-origin" scrolling="no" src="about:blank"></iframe>
        <div class="card-meta">
          <div class="cm-idx">${it.idx} / ${String(ITEMS.length).padStart(2, '0')}</div>
          <div class="cm-t">${it.title}</div>
          <div class="cm-d">${it.desc}</div>
          <div class="cm-tags">${it.tags.map((t) => `<span>${t}</span>`).join('')}</div>
        </div>
      </div>`;
    rail.el.appendChild(card);
    return card;
  });

  // 渲染 iframe（真实 HTML）
  ITEMS.forEach((it, i) => {
    const frame = rail.cards[i].querySelector('iframe');
    const doc = MINI[it.theme];
    frame.srcdoc = doc;
    frame.addEventListener('load', () => {
      try {
        const d = frame.contentDocument;
        if (!d) return;
        d.documentElement.style.zoom = '';
        // 逻辑视口 1200x1600 → 缩放到卡片
        const W = 1200, H = 1600;
        const scale = 360 / W;
        frame.style.width = W + 'px';
        frame.style.height = H + 'px';
        frame.style.transform = `scale(${scale})`;
        frame.style.transformOrigin = 'top left';
        frame.style.position = 'absolute';
        frame.style.left = '0';
        frame.style.top = '0';
      } catch (e) {}
    });
  });

  // 拖拽 / 滚轮
  let dragging = false, startX = 0, startOffset = 0, moved = 0, lastDx = 0;
  rail.el.addEventListener('pointerdown', (e) => {
    dragging = true; startX = e.clientX; startOffset = rail.offset; moved = 0; lastDx = 0;
    rail.dragging = true;
    rail.el.classList.add('is-drag');
    rail.el.setPointerCapture(e.pointerId);
  });
  rail.el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    lastDx = e.clientX - startX;
    moved = Math.abs(lastDx);
    rail.offset = startOffset - lastDx * 0.24;
    rail.target = rail.offset;
    syncActive();
    layoutRail();
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    rail.dragging = false;
    rail.el.classList.remove('is-drag');
    if (moved > 34) {
      const step = STEP();
      const idx = Math.round(rail.offset / step);
      goto(idx);
    } else {
      rail.target = rail.index * STEP();
    }
  };
  rail.el.addEventListener('pointerup', endDrag);
  rail.el.addEventListener('pointercancel', endDrag);

  rail.el.addEventListener('click', (e) => {
    if (moved > 8) return;
    const card = e.target.closest('.card');
    if (!card) return;
    const i = rail.cards.indexOf(card);
    if (i === rail.index) openSite(i);
    else goto(i);
  });

  wrap.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) < 6) return;
    e.preventDefault();
    goto(rail.index + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  document.querySelectorAll('[data-rail-prev]').forEach((b) => b.addEventListener('click', () => goto(rail.index - 1)));
  document.querySelectorAll('[data-rail-next]').forEach((b) => b.addEventListener('click', () => goto(rail.index + 1)));
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') goto(rail.index + 1);
    if (e.key === 'ArrowLeft') goto(rail.index - 1);
  });
}

/* 当前激活卡片（离中心最近） */
function syncActive() {
  const step = STEP();
  const n = ITEMS.length;
  const i = ((Math.round(rail.offset / step) % n) + n) % n;
  if (i !== rail.index) {
    rail.index = i;
    const bar = document.querySelector('.rail-progress .bar i');
    if (bar) bar.style.width = ((i + 1) / n * 100) + '%';
    const cnt = document.querySelector('.rail-count');
    if (cnt) cnt.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    rail.cards.forEach((c, k) => c.classList.toggle('is-active', k === i));
  }
}

function goto(i) {
  const n = ITEMS.length;
  const idx = ((i % n) + n) % n;
  rail.index = idx;
  rail.target = idx * STEP();
  const bar = document.querySelector('.rail-progress .bar i');
  if (bar) bar.style.width = ((idx + 1) / n * 100) + '%';
  const cnt = document.querySelector('.rail-count');
  if (cnt) cnt.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
  rail.cards.forEach((c, k) => c.classList.toggle('is-active', k === idx));
  if (window.Audio) window.Audio.sfx('click');
}

function openSite(i) {
  if (window.Audio) window.Audio.sfx('open');
  const it = ITEMS[i];
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;inset:0;z-index:150;background:#0b0b0d;display:grid;place-items:center;
    opacity:0;transition:opacity .4s ease`;
  const inner = document.createElement('div');
  inner.style.cssText = 'width:min(92vw,1100px);height:min(84vh,760px);border-radius:8px;overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,.6);background:#fff;transform:scale(.96);transition:transform .5s cubic-bezier(.22,1,.36,1)';
  const fr = document.createElement('iframe');
  fr.style.cssText = 'width:1200px;height:1600px;border:0;transform:scale(.92);transform-origin:top left';
  fr.srcdoc = MINI[it.theme];
  inner.appendChild(fr);
  el.appendChild(inner);
  const tip = document.createElement('div');
  tip.style.cssText = 'position:absolute;bottom:26px;left:0;right:0;text-align:center;color:#8a8578;font:11px "JetBrains Mono",monospace;letter-spacing:.2em';
  tip.textContent = `${it.title.toUpperCase()} · ESC 关闭`;
  el.appendChild(tip);
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; inner.style.transform = 'scale(1)'; });
  const close = () => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
    removeEventListener('keydown', key);
  };
  const key = (e) => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', key);
  el.addEventListener('click', close);
}

function layoutRail() {
  const step = STEP();
  const wrapW = rail.el.clientWidth;
  rail.radius = Math.max(330, Math.min(600, wrapW * 0.4));
  rail.cards.forEach((card, i) => {
    const a = i * step - rail.offset;
    const rad = (a * Math.PI) / 180;
    const x = Math.sin(rad) * rail.radius;
    const z = -Math.cos(rad) * rail.radius;
    const depth = (Math.cos(rad) + 1) / 2;
    card.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${-a * 0.4}deg) scale(${0.7 + depth * 0.3})`;
    card.style.opacity = String(0.12 + depth * 0.88);
    card.style.filter = depth > 0.6 ? 'none' : `blur(${(1 - depth) * 4}px)`;
    card.style.zIndex = String(Math.round(depth * 100));
  });
}

function loop() {
  if (!rail.dragging) {
    rail.offset += (rail.target - rail.offset) * 0.11;
    if (Math.abs(rail.target - rail.offset) < 0.02) rail.offset = rail.target;
    layoutRail();
  }
  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', () => {
  buildRail();
  goto(0);
  rail.offset = 0;
  layoutRail();
  loop();
  addEventListener('resize', layoutRail);
  AURACore.initSound('paper');
});
