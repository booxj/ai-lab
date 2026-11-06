# -*- coding: utf-8 -*-
"""把 data/works.json + assets/ 迁移为「能力 → 作品 → 版本」三级目录。

用法：
  python3 tools/migrate_to_three_tier.py --dry-run          # 只打印计划
  python3 tools/migrate_to_three_tier.py                    # 全量迁移
  python3 tools/migrate_to_three_tier.py --only video-html-001

产物：
  works/capabilities.json
  works/<capability>/<work-id>/work.json
  works/<capability>/<work-id>/prompt-log.json
  works/<capability>/<work-id>/<version>/prompt.json
  works/<capability>/<work-id>/<version>/{01.jpg,poster.jpg,video.mp4,thumb.jpg}

备份：首次运行把 data/、assets/、index.html、work.html 复制到
      backup/pre-migration-20261106/（验收通过前不要删）。
"""
import argparse
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "works.json")
BACKUP = os.path.join(ROOT, "backup", "pre-migration-20261106")
WORKS = os.path.join(ROOT, "works")

CAPS = [
    ("image", "影像", "IMAGE", "#e0a45e"),
    ("video", "视频", "VIDEO", "#6fa8e8"),
    ("web", "网页", "WEB", "#57c8b0"),
    ("ppt", "讲义", "PPT", "#b99be6"),
    ("game", "游戏", "GAME", "#e0796a"),
]


def load():
    with open(DATA, encoding="utf-8") as f:
        return json.load(f)


def group_labels(data):
    """从 links 里还原每件作品的 model / series 标签（分组节点退役后仅作展示）。"""
    by_id = {n["id"]: n for n in data["nodes"]}
    series_of, model_of = {}, {}
    for l in data["links"]:
        s, t = l["source"], l["target"]
        if t in by_id and by_id[t].get("kind") == "series":
            series_of.setdefault(s, t)
        if t in by_id and by_id[t].get("kind") == "model":
            model_of.setdefault(s, t)
    labels = {}
    for wid, sid in series_of.items():
        sn = by_id.get(sid, {})
        mid = model_of.get(sid)
        labels[wid] = {
            "series": (sn.get("title") or "").split(" / ")[0] or None,
            "modelNode": by_id.get(mid, {}).get("title") if mid else None,
        }
    return labels


def version_name(work):
    vs = work.get("versions") or []
    if vs:
        return max((v["version"] for v in vs), key=str)
    return (work.get("date") or "undated").replace("-", "")


def plan_work(work, labels):
    """返回该作品要落地的一系列动作（不执行）。"""
    wid = work["id"]
    cap = work["type"]
    wdir = os.path.join(WORKS, cap, wid)
    acts = []
    versions = work.get("versions") or []
    if versions:
        for v in versions:
            ver = v["version"]
            vdir = os.path.join(wdir, ver)
            for p in v.get("detail", []):
                src = os.path.join(ROOT, p)
                base = os.path.basename(p)
                dst = os.path.join(vdir, "video.mp4" if p.endswith(".mp4") else base)
                acts.append(("move", src, dst))
            poster = os.path.join(ROOT, "assets", "images", wid, ver, "poster.jpg")
            if os.path.exists(poster):
                acts.append(("move", poster, os.path.join(vdir, "poster.jpg")))
            thumb = os.path.join(ROOT, "assets", "thumbs", wid, ver + ".jpg")
            if os.path.exists(thumb):
                acts.append(("move", thumb, os.path.join(vdir, "thumb.jpg")))
    else:
        ver = version_name(work)
        vdir = os.path.join(wdir, ver)
        for p in work.get("detail", []):
            src = os.path.join(ROOT, p)
            dst = os.path.join(vdir, "video.mp4" if p.endswith(".mp4") else os.path.basename(p))
            acts.append(("move", src, dst))
        poster = os.path.join(ROOT, "assets", "images", wid, "poster.jpg")
        if os.path.exists(poster):
            acts.append(("move", poster, os.path.join(vdir, "poster.jpg")))
        thumb = os.path.join(ROOT, "assets", "thumbs", wid + ".jpg")
        if os.path.exists(thumb):
            acts.append(("move", thumb, os.path.join(vdir, "thumb.jpg")))
    return cap, wdir, ver if not versions else None, acts


def work_json(work, labels):
    wid = work["id"]
    ver = version_name(work)
    out = {
        "id": wid,
        "title": work["title"],
        "type": work["type"],
        "capability": work["type"],
        "model": work.get("model"),
        "series": labels.get(wid, {}).get("series"),
        "tags": work.get("tags", []),
        "status": work.get("status", "placeholder"),
        "date": work.get("date"),
        "createdAt": work.get("createdAt"),
        "currentVersion": ver,
        "versions": ([v["version"] for v in work["versions"]]
                     if work.get("versions") else [ver]),
        "prompt": work.get("prompt") or None,
        "promptSummary": work.get("promptSummary") or None,
    }
    return out


def version_prompt(work, v):
    return {
        "version": v["version"],
        "at": v.get("createdAt"),
        "effectivePrompt": v.get("effectivePrompt") or v.get("prompt"),
        "promptSeqs": v.get("promptSeqs"),
        "status": v.get("status", "final"),
    }


def prompt_log(work):
    """优先复用 data/prompts/<id>.json；没有就按作品现有字段补一条 initial / 空日志。"""
    wid = work["id"]
    old = os.path.join(ROOT, "data", "prompts", wid + ".json")
    if os.path.exists(old):
        with open(old, encoding="utf-8") as f:
            return json.load(f)
    if work.get("prompt"):
        return {
            "workId": wid,
            "note": "迁移时按 works.json 现有 prompt 字段补建。",
            "log": [{
                "seq": 1,
                "at": work.get("createdAt"),
                "kind": "initial",
                "text": work["prompt"],
                "effectivePrompt": work["prompt"],
                "intent": work.get("promptSummary") or "",
                "affects": [],
                "supersedes": None,
                "status": "applied",
            }],
        }
    return {"workId": wid, "note": "尚未记录需求变更。", "log": []}


def backup_once(dry):
    if os.path.isdir(BACKUP):
        return False
    if dry:
        print("[dry] 将备份 data/ assets/ index.html work.html ->", BACKUP)
        return True
    os.makedirs(BACKUP, exist_ok=True)
    for name in ("data", "assets"):
        shutil.copytree(os.path.join(ROOT, name), os.path.join(BACKUP, name))
    for name in ("index.html", "work.html"):
        shutil.copy2(os.path.join(ROOT, name), os.path.join(BACKUP, name))
    return True


def write_json(path, obj, dry):
    if dry:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", action="append", default=[])
    args = ap.parse_args()
    dry = args.dry_run

    data = load()
    labels = group_labels(data)
    works = [n for n in data["nodes"] if n.get("kind", "work") == "work"]
    if args.only:
        works = [w for w in works if w["id"] in args.only]
    groups = [n for n in data["nodes"] if n.get("kind") in ("model", "series")]

    print("备份:", "已存在" if os.path.isdir(BACKUP) else "将创建")
    backup_once(dry)

    caps = {"order": [c[0] for c in CAPS],
            "items": [{"id": c[0], "name": c[1], "en": c[2], "color": c[3],
                       "order": i + 1, "enabled": True}
                      for i, c in enumerate(CAPS)]}
    if not os.path.exists(os.path.join(WORKS, "capabilities.json")):
        write_json(os.path.join(WORKS, "capabilities.json"), caps, dry)
        print("写入 works/capabilities.json")

    moved = missing = 0
    for w in works:
        wid = w["id"]
        cap = w["type"]
        wdir = os.path.join(WORKS, cap, wid)
        write_json(os.path.join(wdir, "work.json"), work_json(w, labels), dry)
        write_json(os.path.join(wdir, "prompt-log.json"), prompt_log(w), dry)

        versions = w.get("versions") or []
        if versions:
            for v in versions:
                vdir = os.path.join(wdir, v["version"])
                write_json(os.path.join(vdir, "prompt.json"), version_prompt(w, v), dry)
        else:
            vdir = os.path.join(wdir, version_name(w))
            write_json(os.path.join(vdir, "prompt.json"),
                       {"version": version_name(w), "at": w.get("createdAt"),
                        "effectivePrompt": None, "promptSeqs": None,
                        "status": "placeholder"}, dry)

        _, _, _, acts = plan_work(w, labels)
        for kind, src, dst in acts:
            if not os.path.exists(src):
                missing += 1
                print("  缺失:", os.path.relpath(src, ROOT))
                continue
            if not dry:
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.move(src, dst)
            moved += 1
        print(("  [dry] " if dry else "  ") + wid, "->", cap, "assets:" + str(len(acts)))

    print("\n作品 %d 件；分组节点退役 %d 个；素材动作 %d，缺失 %d"
          % (len(works), len(groups), moved, missing))
    if dry:
        print("（dry-run，未写盘）")


if __name__ == "__main__":
    main()
