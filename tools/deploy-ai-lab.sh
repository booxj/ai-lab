#!/usr/bin/env bash
# 把本地 ~/Documents/Trae-CN/ai-lab 同步到 119.45.252.90:/srv/ai-lab
# 用法：bash ~/deploy-ai-lab.sh          （首次会写入 known_hosts）
#       bash ~/deploy-ai-lab.sh --dry     （只校验 + 预览，不落地）
#
# 登录密码不写在本脚本里：
#   优先读环境变量 AI_LAB_DEPLOY_PASS，
#   其次读 ~/.ai-lab-deploy-pass（建议 chmod 600）。
set -euo pipefail

SRC="$HOME/Documents/Trae-CN/ai-lab"
DST="root@119.45.252.90:/srv/ai-lab/"
HOST="119.45.252.90"

DRY=""
if [[ "${1:-}" == "--dry" ]]; then DRY="--dry-run"; fi

PASS="${AI_LAB_DEPLOY_PASS:-}"
if [[ -z "$PASS" ]]; then
  PASS_FILE="$HOME/.ai-lab-deploy-pass"
  if [[ -r "$PASS_FILE" ]]; then
    PASS="$(tr -d '\r\n' < "$PASS_FILE")"
  fi
fi
if [[ -z "$PASS" ]]; then
  echo "缺少部署密码：export AI_LAB_DEPLOY_PASS=...，或写入 $HOME/.ai-lab-deploy-pass（chmod 600）" >&2
  exit 2
fi
export AI_LAB_DEPLOY_PASS="$PASS"

echo "[1/3] 校验并重建索引"
if [[ -n "$DRY" ]]; then
  python3 "$SRC/tools/build_index.py" --check
else
  python3 "$SRC/tools/build_index.py"
fi

echo "[2/3] 同步到 $DST"
/usr/bin/expect <<EOF
set timeout -1
log_user 1
set pass \$env(AI_LAB_DEPLOY_PASS)
spawn /usr/bin/rsync -az $DRY --delete --stats \
  --exclude=.git --exclude=backup --exclude=dist \
  --exclude=tools --exclude=docs --exclude=README.md \
  --exclude=.screenshots --exclude=.trae-html-share-packages \
  --exclude=.DS_Store --exclude='*.zip' \
  -e "ssh -o StrictHostKeyChecking=accept-new -o PubkeyAuthentication=no" \
  "$SRC/" "$DST"
expect {
  -re "(?i)password:" { send -- "\$pass\r"; exp_continue }
  eof
}
catch wait result
exit [lindex \$result 3]
EOF

if [[ -n "$DRY" ]]; then
  echo "[3/3] --dry 完成，未实际推送。"
  exit 0
fi

echo "[3/3] 校验线上索引"
python3 - "$SRC/data/index.json" "$HOST" <<'PY'
import json
import sys
import time
import urllib.request

local_path, host = sys.argv[1], sys.argv[2]
with open(local_path, encoding="utf-8") as f:
    local = json.load(f)
url = "http://%s/data/index.json?ts=%d" % (host, int(time.time()))
with urllib.request.urlopen(url, timeout=15) as r:
    online = json.load(r)

lw = local.get("works", [])
ow = online.get("works", [])
same_stamp = local.get("generatedAt") == online.get("generatedAt")
same_count = len(lw) == len(ow)
same_ids = sorted(w["id"] for w in lw) == sorted(w["id"] for w in ow)

print("本地 generatedAt=%s，作品 %d 件" % (local.get("generatedAt"), len(lw)))
print("线上 generatedAt=%s，作品 %d 件" % (online.get("generatedAt"), len(ow)))
if not (same_stamp and same_count and same_ids):
    print("线上索引与本地不一致，请检查同步结果。", file=sys.stderr)
    sys.exit(1)
print("线上索引与本地一致。")
PY
