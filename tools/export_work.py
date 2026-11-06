#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把一件作品（默认当前版本）导出为可独立分发、双击即开的目录。

用法：
    python3 tools/export_work.py <work-id> [--version 20261106] [--zip]
    python3 tools/export_work.py --all            # 全部作品，各自导出

产物：
    dist/<work-id>-<version>/
        index.html        自包含查看页（内联 CSS/JS/数据，无外部请求）
        assets/           该版本的图片 / 视频 / 封面
        work.json         作品元数据
        prompt-log.json   提示词日志（用户原话逐字保留）
        prompt.json       该版本的实际提示词
        LICENSE.txt       素材与提示词的使用说明
"""
import argparse
import html
import json
import os
import shutil
import sys
import zipfile
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKS = os.path.join(ROOT, "works")
DIST = os.path.join(ROOT, "dist")

MEDIA_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif",
             ".mp4", ".webm", ".mov", ".mp3", ".m4a", ".wav"}

TYPE_NAMES = {"image": "图像", "video": "视频", "web": "网页",
              "ppt": "幻灯片", "game": "游戏"}
TYPE_COLORS = {"image": "#e2b86b", "video": "#1fa08e", "web": "#4a7fd4",
               "ppt": "#8a6fd0", "game": "#d2705c"}


def read_json(path, default=None):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def find_work(work_id):
    for cap in sorted(os.listdir(WORKS)):
        wj = os.path.join(WORKS, cap, work_id, "work.json")
        if os.path.isfile(wj):
            return cap, os.path.dirname(wj), read_json(wj)
    return None, None, None


def pick_version(work, want):
    vs = work.get("versions") or []
    if not vs:
        return None
    if want:
        if want not in vs:
            raise SystemExit("版本不存在：%s（可选：%s）" % (want, ", ".join(vs)))
        return want
    cur = work.get("currentVersion")
    if cur in vs:
        return cur
    return sorted(vs)[-1]


def license_text(work, version):
    return """AI LAB 作品导出 · {title}

作品编号：{wid}
版本：{ver}
导出时间：{at}

素材（assets/ 下的图片、视频、封面）版权归作者所有，仅供查看与评审使用，
未经作者书面许可不得再分发、商用或用于训练模型。

prompt.json 与 prompt-log.json 为该作品的提示词记录：log 中的 text 字段
是用户原话的逐字记录，未做任何改写；effectivePrompt 为实际用于生成的那段。
导出时两者一并保留，便于追溯每一次改动。
""".format(title=work.get("title", ""), wid=work.get("id", ""),
           ver=version, at=datetime.now().strftime("%Y-%m-%d %H:%M"))


def build_page(work, version, media, prompt, prompt_log):
    t = work.get("type", "image")
    color = TYPE_COLORS.get(t, "#8a8f9c")
    title = html.escape(work.get("title") or work.get("id", ""))
    tags = work.get("tags") or []
    meta_bits = [
        TYPE_NAMES.get(t, t),
        work.get("model") or "",
        work.get("date") or "",
        "版本 " + version,
        work.get("series") or "",
    ]
    meta = " · ".join([m for m in meta_bits if m])
    tag_html = "".join('<span class="tag">%s</span>' % html.escape(x) for x in tags)
    log = (prompt_log or {}).get("log") or []
    log_html = []
    for e in sorted(log, key=lambda x: x.get("seq", 0)):
        state = {"applied": "应用", "superseded": "被取代", "rejected": "已否决"}.get(
            e.get("status"), e.get("status") or "")
        log_html.append(
            '<li class="%s"><div class="h"><b>#%s</b><span>%s</span>'
            '<em>%s</em></div><p>%s</p><small>%s</small></li>' % (
                "sup" if e.get("status") == "superseded" else (
                    "rej" if e.get("status") == "rejected" else ""),
                e.get("seq"), html.escape(e.get("at") or ""), state,
                html.escape(e.get("text") or ""),
                html.escape(e.get("intent") or "")))
    data = {
        "media": media,
        "title": title,
        "id": work.get("id"),
        "version": version,
        "prompt": prompt.get("effectivePrompt") or work.get("prompt") or "",
        "raw": work.get("prompt") or "",
    }
    return """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · {ver}</title>
<style>
  :root{{--ink:#efeae0;--dim:rgba(239,234,224,.52);--hair:rgba(239,234,224,.16);
    --acc:{color};--bg:#06070b}}
  *{{box-sizing:border-box}}
  html,body{{margin:0;background:var(--bg);color:var(--ink);
    font-family:"Helvetica Neue","PingFang SC","Hiragino Sans GB",sans-serif;
    -webkit-font-smoothing:antialiased}}
  .wrap{{max-width:1180px;margin:0 auto;padding:34px 26px 70px}}
  header{{display:flex;justify-content:space-between;align-items:baseline;
    border-bottom:1px solid var(--hair);padding-bottom:14px}}
  .brand b{{font-family:"Didot","Songti SC",serif;font-weight:400;font-size:17px;
    letter-spacing:.4em}}
  .brand span{{display:block;margin-top:7px;font-size:9px;letter-spacing:.28em;color:var(--dim)}}
  header .ver{{font-size:9px;letter-spacing:.24em;color:var(--dim)}}
  .stage{{position:relative;margin-top:22px;background:#000;border:1px solid var(--hair);
    aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;overflow:hidden}}
  .stage img,.stage video{{max-width:100%;max-height:100%;display:none}}
  .stage .on{{display:block}}
  .stage video{{width:100%;height:100%;object-fit:contain}}
  .nav{{position:absolute;top:50%;transform:translateY(-50%);width:34px;height:52px;
    border:0;background:rgba(6,7,11,.55);color:var(--ink);font-size:14px;cursor:pointer;
    opacity:.5;transition:opacity .2s}}
  .nav:hover{{opacity:1}}
  #prev{{left:0}} #next{{right:0}}
  .dots{{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
    display:flex;gap:6px}}
  .dots button{{width:5px;height:5px;padding:0;border:0;border-radius:50%;
    background:rgba(239,234,224,.25);cursor:pointer}}
  .dots button.on{{background:rgba(239,234,224,.85)}}
  h1{{font-family:"Didot","Songti SC",serif;font-weight:400;
    font-size:clamp(21px,3vw,33px);letter-spacing:.03em;margin:26px 0 0;line-height:1.3}}
  .meta{{margin-top:10px;font-size:10px;letter-spacing:.2em;color:var(--dim)}}
  .tags{{margin-top:12px;display:flex;gap:7px;flex-wrap:wrap}}
  .tag{{font-size:9px;letter-spacing:.16em;padding:4px 8px;
    border:1px solid var(--hair);color:var(--dim)}}
  section{{margin-top:34px;border-top:1px solid var(--hair);padding-top:16px}}
  h2{{font-size:9px;letter-spacing:.3em;color:var(--dim);margin:0 0 12px;font-weight:400}}
  .prompt{{font-size:12px;line-height:1.95;white-space:pre-wrap;color:rgba(239,234,224,.78)}}
  .prompt .raw{{display:block;margin-top:10px;color:var(--dim);font-size:11px}}
  ol.log{{list-style:none;margin:0;padding:0}}
  ol.log li{{padding:11px 0;border-bottom:1px solid rgba(239,234,224,.08)}}
  ol.log .h{{display:flex;gap:10px;align-items:baseline;font-size:9px;
    letter-spacing:.14em;color:var(--dim)}}
  ol.log .h b{{font-weight:400;color:var(--ink)}}
  ol.log .h em{{margin-left:auto;font-style:normal}}
  ol.log p{{margin:7px 0 0;font-size:11px;line-height:1.85;color:rgba(239,234,224,.72)}}
  ol.log small{{display:block;margin-top:5px;font-size:10px;color:rgba(239,234,224,.4)}}
  ol.log .sup p,ol.log .rej p{{opacity:.4;text-decoration:line-through}}
  ol.log .rej .h b{{color:#d2705c}}
  footer{{margin-top:44px;border-top:1px solid var(--hair);padding-top:14px;
    font-size:9px;letter-spacing:.14em;line-height:2;color:rgba(239,234,224,.34)}}
  @media (max-width:640px){{.wrap{{padding:20px 16px 50px}}}}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="brand"><b>AI LAB</b><span>作品导出 / WORK EXPORT</span></div>
    <div class="ver">{wid} · {ver}</div>
  </header>

  <div class="stage" id="stage">
    {media_html}
    <button class="nav" id="prev" aria-label="上一张">←</button>
    <button class="nav" id="next" aria-label="下一张">→</button>
    <div class="dots" id="dots"></div>
  </div>

  <h1>{title}</h1>
  <div class="meta">{meta}</div>
  <div class="tags">{tags}</div>

  <section>
    <h2>提示词 / PROMPT</h2>
    <div class="prompt">{prompt}{raw}</div>
  </section>

  <section>
    <h2>需求时间线 / PROMPT LOG</h2>
    <ol class="log">{log}</ol>
  </section>

  <footer>
    导出时间 {now} · 本页与 assets/ 完全离线可用，无外部请求。<br>
    素材版权归作者所有；prompt-log 中的 text 为用户原话逐字记录，未改写。
  </footer>
</div>
<script>
(function(){{
  var data = {data_json};
  var media = data.media || [];
  var i = 0;
  var stage = document.getElementById('stage');
  var dots = document.getElementById('dots');
  var items = stage.querySelectorAll('[data-idx]');
  if (media.length > 1){{
    media.forEach(function(_, k){{
      var b = document.createElement('button');
      b.addEventListener('click', function(){{ show(k); }});
      dots.appendChild(b);
    }});
  }}
  function show(k){{
    if (!media.length) return;
    i = (k + media.length) % media.length;
    items.forEach(function(el){{
      var on = (+el.dataset.idx) === i;
      el.classList.toggle('on', on);
      if (!on && el.tagName === 'VIDEO') el.pause();
    }});
    [].forEach.call(dots.children, function(d, n){{ d.classList.toggle('on', n === i); }});
  }}
  document.getElementById('prev').addEventListener('click', function(){{ show(i - 1); }});
  document.getElementById('next').addEventListener('click', function(){{ show(i + 1); }});
  if (media.length < 2){{
    document.getElementById('prev').style.display = 'none';
    document.getElementById('next').style.display = 'none';
  }}
  document.addEventListener('keydown', function(e){{
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  }});
  show(0);
}})();
</script>
</body>
</html>
""".format(title=title, wid=html.escape(work.get("id", "")), ver=version,
           color=color, meta=html.escape(meta), tags=tag_html,
           media_html="\n    ".join(media),
           prompt=html.escape(data["prompt"]),
           raw=('<span class="raw">原话：%s</span>' % html.escape(data["raw"]))
               if data["raw"] and data["raw"] != data["prompt"] else "",
           log="".join(log_html) or "<li><p>暂无记录</p></li>",
           now=datetime.now().strftime("%Y-%m-%d %H:%M"),
           data_json=json.dumps(data, ensure_ascii=False))


def export(work_id, want_version=None, do_zip=False):
    cap, wdir, work = find_work(work_id)
    if not work:
        raise SystemExit("找不到作品：%s" % work_id)
    ver = pick_version(work, want_version)
    if not ver:
        raise SystemExit("作品还没有版本，无法导出：%s" % work_id)

    src = os.path.join(wdir, ver)
    dest = os.path.join(DIST, "%s-%s" % (work_id, ver))
    if os.path.isdir(dest):
        shutil.rmtree(dest)
    os.makedirs(os.path.join(dest, "assets"), exist_ok=True)

    media_names = []
    for name in sorted(os.listdir(src)):
        ext = os.path.splitext(name)[1].lower()
        if ext in MEDIA_EXT:
            shutil.copy2(os.path.join(src, name), os.path.join(dest, "assets", name))
            media_names.append(name)

    prompt = read_json(os.path.join(src, "prompt.json"), {}) or {}
    prompt_log = read_json(os.path.join(wdir, "prompt-log.json"), {"log": []}) or {"log": []}

    shutil.copy2(os.path.join(wdir, "work.json"), os.path.join(dest, "work.json"))
    with open(os.path.join(dest, "prompt-log.json"), "w", encoding="utf-8") as f:
        json.dump(prompt_log, f, ensure_ascii=False, indent=2)
    if prompt:
        with open(os.path.join(dest, "prompt.json"), "w", encoding="utf-8") as f:
            json.dump(prompt, f, ensure_ascii=False, indent=2)
    with open(os.path.join(dest, "LICENSE.txt"), "w", encoding="utf-8") as f:
        f.write(license_text(work, ver))

    videos = [n for n in media_names if n.lower().endswith((".mp4", ".webm", ".mov"))]
    images = [n for n in media_names if n.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
    poster = "poster.jpg" if "poster.jpg" in images else None
    media, order = [], []
    if videos:
        media.append(
            '<video controls playsinline preload="metadata" data-idx="0"%s'
            ' src="assets/%s"></video>' % (
                (' poster="assets/%s"' % poster) if poster else "",
                html.escape(videos[0])))
        order.append(videos[0])
    for n in images:
        if n in ("thumb.jpg", "poster.jpg"):
            continue
        media.append('<img alt="" src="assets/%s" data-idx="%d">' % (html.escape(n), len(order)))
        order.append(n)
    if not media:
        media = ['<div style="color:#666;font-size:12px">该版本没有可展示的媒体文件</div>']

    page = build_page(work, ver, media, prompt, prompt_log)
    with open(os.path.join(dest, "index.html"), "w", encoding="utf-8") as f:
        f.write(page)

    total = sum(os.path.getsize(os.path.join(dp, fn))
                for dp, _, fns in os.walk(dest) for fn in fns)
    print("导出完成：%s" % dest)
    print("  媒体 %d 个（视频 %d / 图片 %d），总体积 %.2f MB"
          % (len(order), len(videos), len([n for n in order if n in images]),
             total / 1024 / 1024))

    if do_zip:
        zpath = dest + ".zip"
        with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
            for dp, _, fns in os.walk(dest):
                for fn in fns:
                    p = os.path.join(dp, fn)
                    z.write(p, os.path.join(os.path.basename(dest),
                                            os.path.relpath(p, dest)))
        print("  打包：%s（%.2f MB）" % (zpath, os.path.getsize(zpath) / 1024 / 1024))
    return dest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("work_id", nargs="?")
    ap.add_argument("--version")
    ap.add_argument("--zip", action="store_true")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()

    os.makedirs(DIST, exist_ok=True)
    if args.all:
        ids = []
        for cap in sorted(os.listdir(WORKS)):
            cdir = os.path.join(WORKS, cap)
            if not os.path.isdir(cdir):
                continue
            for wid in sorted(os.listdir(cdir)):
                if os.path.isfile(os.path.join(cdir, wid, "work.json")):
                    ids.append(wid)
        for wid in ids:
            export(wid, None, args.zip)
        print("共导出 %d 件作品到 %s" % (len(ids), DIST))
        return
    if not args.work_id:
        raise SystemExit("用法：export_work.py <work-id> [--version 20261106] [--zip]")
    export(args.work_id, args.version, args.zip)


if __name__ == "__main__":
    main()
