#!/usr/bin/env bash
# up.sh로 띄운 Next.js dev 서버와 Postgres 컨테이너를 내린다.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

PID_FILE=".dev-server.pid"

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE")"
  if kill -0 "$PID" 2>/dev/null; then
    echo "▶ Next.js dev 서버 종료 중... (PID $PID)"
    kill "$PID" 2>/dev/null || true
    wait "$PID" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
else
  echo "dev 서버 PID 파일이 없습니다 (이미 내려갔거나 다른 방식으로 실행됨)."
fi

echo "▶ Postgres 컨테이너 정지 중..."
docker compose stop db

echo "✅ 완료."
