#!/usr/bin/env bash
# Run on Linux server from project root: bash scripts/reset-env.sh
# Creates a UTF-8 .env (ASCII only). Backs up existing .env if present.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.env"

if [[ -f "$OUT" ]]; then
  echo "Backing up existing .env -> ${OUT}.bak"
  cp -a "$OUT" "${OUT}.bak.$(date +%s)"
fi

cat > "$OUT" << 'EOF'
DEEPSEEK_API_KEY=
PORT=3001
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=hengyi_huoke
EOF

chmod 600 "$OUT"
echo "OK: wrote $OUT"
file "$OUT"
echo "Edit password/user if needed: nano $OUT"
