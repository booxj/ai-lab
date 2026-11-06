# -*- coding: utf-8 -*-
"""扫描 works/ 三级目录，聚合出页面用的轻索引。

产物：
  data/index.json    星图 / 列表用的轻索引（不含提示词与正文）
  data/index.js      index.json 的 file:// 镜像
  data/thumbs.js     星图贴图 data URI（键 <id> 与 <id>@<version>）
  works/<cap>/<id>/work.js  单件作品的 file:// 数据包（work + 日志 + 各版 prompt）

用法：python3 tools/build_index.py [--check]
"""
import base64
import glob
import io
import json
import os
import sys
from datetime import datetime, timezone, timedelta

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKS = os.path.join(ROOT, "works")
DATA = os.path.join(ROOT, "data")
TEX_SIZE = (384, 240)

TZ = timezone(timedelta(hours=8))


def read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def read_text(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def tex_uri(path):
    im = Image.open(path).convert("RGB").resize(TEX_SIZE, Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=70, optimize=True, progressive=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def _clip(text, n=46):
    if not text:
        return None
    text = " ".join(str(text).split())
    return text if len(text) <= n else text[:n] + "…"


def collect():
    caps_doc = read_json(os.path.join(WORKS, "capabilities.json"))
    caps = {c["id"]: c for c in caps_doc["items"]}
    works, tex, problems = [], {}, []
    for wpath in sorted(glob.glob(os.path.join(WORKS, "*", "*", "work.json"))):
        wdir = os.path.dirname(wpath)
        work = read_json(wpath)
        wid = work["id"]
        cap = work["capability"]
        if cap not in caps:
            problems.append("%s 的 capability=%s 不在 capabilities.json" % (wid, cap))
            continue

        versions = []
        for v in work.get("versions", []):
            vdir = os.path.join(wdir, v)
            meta_path = os.path.join(vdir, "prompt.json")
            meta = read_json(meta_path) if os.path.exists(meta_path) else {}
            thumb = os.path.join(vdir, "thumb.jpg")
            if not os.path.exists(thumb):
                problems.append("%s/%s 缺 thumb.jpg" % (wid, v))
            versions.append({
                "version": v,
                "at": meta.get("at"),
                "status": meta.get("status", work.get("status")),
                "thumb": os.path.relpath(thumb, ROOT) if os.path.exists(thumb) else None,
                "poster": (os.path.relpath(os.path.join(vdir, "poster.jpg"), ROOT)
                           if os.path.exists(os.path.join(vdir, "poster.jpg")) else None),
                "video": (os.path.relpath(os.path.join(vdir, "video.mp4"), ROOT)
                          if os.path.exists(os.path.join(vdir, "video.mp4")) else None),
                "images": sorted(os.path.relpath(p, ROOT) for p in
                                 glob.glob(os.path.join(vdir, "*.jpg"))
                                 if os.path.basename(p) not in ("thumb.jpg", "poster.jpg")),
            })
            if os.path.exists(thumb):
                tex[wid + "@" + v] = tex_uri(thumb)

        latest = work.get("currentVersion") or (versions[-1]["version"] if versions else None)
        newest = next((v for v in versions if v["version"] == latest),
                      versions[-1] if versions else {})
        if newest.get("thumb"):
            tex[wid] = tex_uri(os.path.join(ROOT, newest["thumb"]))

        works.append({
            "id": wid,
            "title": work["title"],
            "capability": cap,
            "type": work.get("type", cap),
            "model": work.get("model"),
            "series": work.get("series"),
            "tags": work.get("tags", []),
            "status": work.get("status"),
            "date": work.get("date"),
            "createdAt": work.get("createdAt"),
            "currentVersion": latest,
            "versionCount": len(versions),
            "versions": versions,
            "thumb": newest.get("thumb"),
            # 星图 hover 卡片只放一句摘要，完整提示词走 work.json
            "promptSummary": work.get("promptSummary") or _clip(work.get("prompt")),
        })

    counts = {}
    for w in works:
        counts[w["capability"]] = counts.get(w["capability"], 0) + 1
    cap_list = [dict(c, count=counts.get(c["id"], 0))
                for c in sorted(caps_doc["items"], key=lambda x: x["order"])]
    return cap_list, works, tex, problems


def bundle_work(work_entry):
    """file:// 下按需注入的单件数据包。"""
    wdir = os.path.join(WORKS, work_entry["capability"], work_entry["id"])
    work = read_json(os.path.join(wdir, "work.json"))
    log_path = os.path.join(wdir, "prompt-log.json")
    bundle = {
        "work": work,
        "promptLog": read_json(log_path) if os.path.exists(log_path) else {"log": []},
        "versionPrompts": {},
    }
    for v in work.get("versions", []):
        p = os.path.join(wdir, v, "prompt.json")
        if os.path.exists(p):
            bundle["versionPrompts"][v] = read_json(p)
    return bundle


def main():
    check = "--check" in sys.argv
    cap_list, works, tex, problems = collect()
    index = {
        "generatedAt": datetime.now(TZ).isoformat(timespec="seconds"),
        "capabilities": cap_list,
        "works": works,
    }
    os.makedirs(DATA, exist_ok=True)
    body = json.dumps(index, ensure_ascii=False, indent=1)
    with open(os.path.join(DATA, "index.json"), "w", encoding="utf-8") as f:
        f.write(body + "\n")
    with open(os.path.join(DATA, "index.js"), "w", encoding="utf-8") as f:
        f.write("/* 自动生成：tools/build_index.py，勿手改。 */\n")
        f.write("window.AI_LAB_INDEX = " + body + ";\n")
    with open(os.path.join(DATA, "thumbs.js"), "w", encoding="utf-8") as f:
        f.write("/* 自动生成：tools/build_index.py，勿手改。 */\n")
        f.write("window.AI_LAB_THUMBS = " +
                json.dumps(tex, ensure_ascii=False) + ";\n")

    if not check:
        for w in works:
            bundle = bundle_work(w)
            with open(os.path.join(WORKS, w["capability"], w["id"], "work.js"),
                      "w", encoding="utf-8") as f:
                f.write("/* 自动生成：tools/build_index.py，勿手改。 */\n")
                f.write("window.AI_LAB_WORK_CACHE = window.AI_LAB_WORK_CACHE || {};\n")
                f.write("window.AI_LAB_WORK_CACHE[" + json.dumps(w["id"]) + "] = " +
                        json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) +
                        ";\n")

    size = os.path.getsize(os.path.join(DATA, "index.json"))
    print("能力 %d / 作品 %d / 贴图 %d" % (len(cap_list), len(works), len(tex)))
    print("data/index.json %.1f KB；data/thumbs.js %.1f KB"
          % (size / 1024, os.path.getsize(os.path.join(DATA, "thumbs.js")) / 1024))
    if problems:
        print("问题:", *problems, sep="\n  ")
        sys.exit(1)


if __name__ == "__main__":
    main()
