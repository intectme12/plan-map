#!/usr/bin/env bash
# DB(Docker Postgres) + Next.js dev 서버(프론트+백엔드 겸용)를 한번에 띄운다.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

PID_FILE=".dev-server.pid"
LOG_FILE=".dev-server.log"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "이미 실행 중입니다 (PID $(cat "$PID_FILE")). 먼저 ./down.sh를 실행하세요."
  exit 1
fi

echo "▶ Postgres 컨테이너 기동 중..."
docker compose up -d db

echo "▶ Postgres 준비 대기 중..."
until docker compose exec -T db pg_isready -U planmap >/dev/null 2>&1; do
  sleep 1
done

echo "▶ 마이그레이션 적용 중..."
(cd apps/web && npx prisma migrate deploy)

echo "▶ Next.js dev 서버 기동 중... (로그: $LOG_FILE)"
nohup npm run dev --workspace=web > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

echo "✅ 완료. http://localhost:3000"
echo "   로그 보기: tail -f $LOG_FILE"
echo "   내리기:   ./down.sh"
