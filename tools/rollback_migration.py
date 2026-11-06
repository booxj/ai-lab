#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把三级结构迁移回滚到 backup/pre-migration-20261106/ 的状态。

用法：
    python3 tools/rollback_migration.py --dry-run
    python3 tools/rollback_migration.py --yes

做的事：
  1. 把当前 works/ 与 dist/ 移到 backup/rolled-back-<时间戳>/（不删除，保留证据）；
  2. 用备份覆盖 index.html、work.html、assets/、data/；
  3. 备份里若带 vendor/openseadragon.*，一并恢复（旧详情页的 DZI 需要它）。

注意：迁移完成后 openseadragon 已从 vendor/ 移除，且离线环境无法重新下载；
若备份中没有该文件，回滚后的旧详情页只能看整图、不能深度缩放。
"""
import argparse
import os
import shutil
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP = os.path.join(ROOT, "backup", "pre-migration-20261106")


def move(src, dst):
    if os.path.exists(src):
        shutil.move(src, dst)


def copytree(src, dst):
    if not os.path.isdir(src):
        return False
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--yes", action="store_true", help="确认执行（不加只做 dry-run）")
    args = ap.parse_args()

    need = ["index.html", "work.html", "assets", "data"]
    missing = [p for p in need if not os.path.exists(os.path.join(BACKUP, p))]
    if missing:
        sys.exit("备份不完整，缺少：%s" % ", ".join(missing))

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    archive = os.path.join(ROOT, "backup", "rolled-back-" + stamp)
    dry = not args.yes

    print("备份源：", BACKUP)
    print("归档到：", archive, "（works/ 与 dist/）" if not dry else "（dry-run 不移动）")
    for p in ["works", "dist"]:
        print("  移动" if os.path.exists(os.path.join(ROOT, p)) else "  跳过", p)
    print("  恢复 index.html / work.html / assets/ / data/")

    if dry:
        print("\n这是 dry-run。确认无误后加 --yes 执行。")
        return

    os.makedirs(archive, exist_ok=True)
    for p in ["works", "dist"]:
        move(os.path.join(ROOT, p), os.path.join(archive, p))

    for p in ["assets", "data"]:
        copytree(os.path.join(BACKUP, p), os.path.join(ROOT, p))
    for p in ["index.html", "work.html"]:
        shutil.copy2(os.path.join(BACKUP, p), os.path.join(ROOT, p))

    vendor = os.path.join(BACKUP, "vendor")
    restored = []
    if os.path.isdir(vendor):
        for f in os.listdir(vendor):
            shutil.copy2(os.path.join(vendor, f), os.path.join(ROOT, "vendor", f))
            restored.append(f)
    print("vendor 恢复：", ", ".join(restored) if restored else "无（旧详情页将无法深度缩放）")
    print("回滚完成。当前数据已归档在", archive)


if __name__ == "__main__":
    main()
