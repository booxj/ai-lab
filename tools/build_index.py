# -*- coding: utf-8 -*-
"""扫描 works/ 三级目录，聚合出页面用的轻索引。

产物：
  data/index.json    星图 / 列表用的轻索引（不含提示词与正文）
  data/index.js      index.json 的 file:// 镜像
  data/thumbs.js     星图贴图 data URI（键 <id> 与 <id>@<version>）
  works/<cap>/<id>/work.js  单件作品的 file:// 数据包（work + 日志 + 各版 prompt）

用法：python3 tools/build_index.py [--check]
  --check  只校验数据，不写任何文件
"""
import base64
import glob
import io
import json
import os
import re
import sys
from datetime import datetime, timezone, timedelta

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKS = os.path.join(ROOT, "works")
DATA = os.path.join(ROOT, "data")
TEX_SIZE = (384, 240)

TZ = timezone(timedelta(hours=8))

VERSION_RE = re.compile(r"^\d{8}$")
IMAGE_RE = re.compile(r"^(\d{2})\.jpg$")
THUMB_SIZE = (640, 400)
THUMB_MAX = 80 * 1024
IMAGE_MAX = int(1.2 * 1024 * 1024)


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


def check_thumb(wid, v, path, problems):
    """校验 thumb.jpg 的尺寸与体积；不合格返回 False。"""
    size = os.path.getsize(path)
    if size > THUMB_MAX:
        problems.append("%s/%s thumb.jpg 为 %.1f KB，超过 80 KB"
                        % (wid, v, size / 1024))
        return False
    try:
        with Image.open(path) as im:
            dim = im.size
    except Exception as exc:
        problems.append("%s/%s thumb.jpg 无法读取：%s" % (wid, v, exc))
        return False
    if dim != THUMB_SIZE:
        problems.append("%s/%s thumb.jpg 为 %dx%d，应为 640x400"
                        % (wid, v, dim[0], dim[1]))
        return False
    return True


def check_images(wid, v, vdir, problems):
    """详情图必须是 01.jpg 起连号的 NN.jpg，单张不超过 1.2 MB。"""
    found = []
    for path in glob.glob(os.path.join(vdir, "*.jpg")):
        base = os.path.basename(path)
        if base in ("thumb.jpg", "poster.jpg"):
            continue
        m = IMAGE_RE.match(base)
        if not m:
            problems.append("%s/%s 的图片 %s 不符合 NN.jpg 命名" % (wid, v, base))
            continue
        found.append((int(m.group(1)), base, path))
    found.sort()
    nums = [n for n, _, _ in found]
    if nums != list(range(1, len(nums) + 1)):
        problems.append("%s/%s 的详情图编号不连续：%s（应从 01 起连号）"
                        % (wid, v, ", ".join("%02d" % n for n in nums) or "无"))
    for _, base, path in found:
        size = os.path.getsize(path)
        if size > IMAGE_MAX:
            problems.append("%s/%s/%s 为 %.1f KB，超过 1.2 MB"
                            % (wid, v, base, size / 1024))
    return [os.path.relpath(path, ROOT) for _, _, path in found]


def collect():
    caps_doc = read_json(os.path.join(WORKS, "capabilities.json"))
    caps = {c["id"]: c for c in caps_doc["items"]}
    works, tex, problems = [], {}, []
    for wpath in sorted(glob.glob(os.path.join(WORKS, "*", "*", "work.json"))):
        wdir = os.path.dirname(wpath)
        wid_dir = os.path.basename(wdir)
        cap_dir = os.path.basename(os.path.dirname(wdir))
        try:
            work = read_json(wpath)
        except Exception as exc:
            problems.append("%s 读取失败：%s" % (os.path.relpath(wpath, ROOT), exc))
            continue

        missing = [k for k in ("id", "title", "capability", "versions") if k not in work]
        if missing:
            problems.append("%s/work.json 缺少必填字段：%s" % (wid_dir, ", ".join(missing)))
            continue
        wid = work["id"]
        cap = work["capability"]
        if wid != wid_dir:
            problems.append("%s/work.json 的 id=%s 与目录名不一致" % (wid_dir, wid))
            continue
        if cap != cap_dir:
            problems.append("%s/work.json 的 capability=%s 与目录名 %s 不一致"
                            % (wid, cap, cap_dir))
            continue
        if cap not in caps:
            problems.append("%s 的 capability=%s 不在 capabilities.json" % (wid, cap))
            continue

        declared = []
        if not isinstance(work["versions"], list) or not work["versions"]:
            problems.append("%s 的 versions 为空或格式不对" % wid)
        else:
            for v in work["versions"]:
                if not isinstance(v, str) or not VERSION_RE.match(v):
                    problems.append("%s 的版本号 %r 不是 YYYYMMDD" % (wid, v))
                    continue
                if v in declared:
                    problems.append("%s 的版本号 %s 重复" % (wid, v))
                    continue
                declared.append(v)

        disk = sorted(d for d in os.listdir(wdir)
                      if VERSION_RE.match(d) and os.path.isdir(os.path.join(wdir, d)))
        for v in declared:
            if v not in disk:
                problems.append("%s 声明的版本 %s 没有对应目录" % (wid, v))
        for v in disk:
            if v not in declared:
                problems.append("%s 磁盘上的版本 %s 未写进 work.json 的 versions" % (wid, v))

        versions = []
        for v in declared:
            vdir = os.path.join(wdir, v)
            if not os.path.isdir(vdir):
                continue
            meta_path = os.path.join(vdir, "prompt.json")
            if not os.path.exists(meta_path):
                problems.append("%s/%s 缺 prompt.json" % (wid, v))
                meta = {}
            else:
                try:
                    meta = read_json(meta_path)
                except Exception as exc:
                    problems.append("%s/%s/prompt.json 读取失败：%s" % (wid, v, exc))
                    meta = {}

            status = meta.get("status", work.get("status"))
            if status == "final" and not os.path.exists(os.path.join(vdir, "index.html")):
                problems.append("%s/%s 是 final 版本但缺 index.html" % (wid, v))

            thumb = os.path.join(vdir, "thumb.jpg")
            thumb_ok = False
            if not os.path.exists(thumb):
                problems.append("%s/%s 缺 thumb.jpg" % (wid, v))
            else:
                thumb_ok = check_thumb(wid, v, thumb, problems)

            versions.append({
                "version": v,
                "at": meta.get("at"),
                "status": status,
                # 版本级展示文案：版本页 / hover / 查看器标题只读这里
                "title": meta.get("title"),
                "summary": meta.get("summary"),
                "promptSummary": meta.get("promptSummary"),
                "duration": meta.get("duration"),
                "thumb": os.path.relpath(thumb, ROOT) if thumb_ok else None,
                "poster": (os.path.relpath(os.path.join(vdir, "poster.jpg"), ROOT)
                           if os.path.exists(os.path.join(vdir, "poster.jpg")) else None),
                "video": (os.path.relpath(os.path.join(vdir, "video.mp4"), ROOT)
                          if os.path.exists(os.path.join(vdir, "video.mp4")) else None),
                "images": check_images(wid, v, vdir, problems),
            })
            if thumb_ok:
                tex[wid + "@" + v] = tex_uri(thumb)

        cv = work.get("currentVersion")
        if not cv:
            problems.append("%s 缺 currentVersion" % wid)
        elif cv not in declared:
            problems.append("%s 的 currentVersion=%s 不在 versions 里" % (wid, cv))
        present = [v["version"] for v in versions]
        latest = cv if cv in present else (present[-1] if present else None)
        newest = next((v for v in versions if v["version"] == latest), {})
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


def write_if_changed(path, text):
    """内容一致就不落盘，避免无意义的 mtime 变化。"""
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            if f.read() == text:
                return False
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return True


def main():
    check = "--check" in sys.argv
    cap_list, works, tex, problems = collect()

    if problems:
        print("问题:", *problems, sep="\n  ")
        print("共 %d 个问题，未写入任何文件。" % len(problems))
        sys.exit(1)

    # 先把所有产物在内存里算好，确认不会再失败，再统一写盘
    payload = {"capabilities": cap_list, "works": works}
    index_path = os.path.join(DATA, "index.json")
    stamp = datetime.now(TZ).isoformat(timespec="seconds")
    if os.path.exists(index_path):
        try:
            old = read_json(index_path)
            if {k: old.get(k) for k in ("capabilities", "works")} == payload:
                # 内容没变，沿用旧时间戳，避免 --check / 重建产生无意义 diff
                stamp = old.get("generatedAt") or stamp
        except Exception:
            pass
    index = {"generatedAt": stamp}
    index.update(payload)
    body = json.dumps(index, ensure_ascii=False, indent=1)

    bundles = {}
    for w in works:
        try:
            bundles[w["id"]] = bundle_work(w)
        except Exception as exc:
            problems.append("%s 无法生成 work.js 数据：%s" % (w["id"], exc))
    if problems:
        print("问题:", *problems, sep="\n  ")
        print("共 %d 个问题，未写入任何文件。" % len(problems))
        sys.exit(1)

    if check:
        print("校验通过：能力 %d / 作品 %d（--check 未写盘）"
              % (len(cap_list), len(works)))
        return

    os.makedirs(DATA, exist_ok=True)
    changed = write_if_changed(index_path, body + "\n")
    changed = write_if_changed(
        os.path.join(DATA, "index.js"),
        "/* 自动生成：tools/build_index.py，勿手改。 */\n"
        "window.AI_LAB_INDEX = " + body + ";\n") or changed
    changed = write_if_changed(
        os.path.join(DATA, "thumbs.js"),
        "/* 自动生成：tools/build_index.py，勿手改。 */\n"
        "window.AI_LAB_THUMBS = " + json.dumps(tex, ensure_ascii=False) + ";\n") or changed

    for w in works:
        text = ("/* 自动生成：tools/build_index.py，勿手改。 */\n"
                "window.AI_LAB_WORK_CACHE = window.AI_LAB_WORK_CACHE || {};\n"
                "window.AI_LAB_WORK_CACHE[" + json.dumps(w["id"]) + "] = " +
                json.dumps(bundles[w["id"]], ensure_ascii=False,
                           separators=(",", ":")) + ";\n")
        changed = write_if_changed(
            os.path.join(WORKS, w["capability"], w["id"], "work.js"), text) or changed

    size = os.path.getsize(index_path)
    print("能力 %d / 作品 %d / 贴图 %d" % (len(cap_list), len(works), len(tex)))
    print("data/index.json %.1f KB；data/thumbs.js %.1f KB"
          % (size / 1024, os.path.getsize(os.path.join(DATA, "thumbs.js")) / 1024))
    print("索引%s" % ("已更新" if changed else "无变化，跳过写入"))


if __name__ == "__main__":
    main()
