#!/usr/bin/env bash
# DB(Docker Postgres) + Next.js dev 서버(프론트+백엔드 겸용)를 한번에 띄운다.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

PID_FILE=".dev-server.pid"
LOG_FILE=".dev-server.log"
PORT=3000

# Git Bash에서 `nohup cmd &`의 `$!`는 MSYS 내부 PID라 실제 Windows PID와 안 맞는 경우가 있어
# (taskkill/kill로 못 찾음), 기동 여부·종료 대상 모두 포트 점유 여부(netstat)로 판단한다.
port_pid() {
  # 포트를 안 쓰는 중이면(가장 흔한 경우) grep이 매치 없음(exit 1)을 내는데, pipefail 때문에
  # 그게 스크립트 전체를 죽이지 않도록 `|| true`로 감싼다.
  netstat -ano 2>/dev/null | grep -E ":$PORT[[:space:]].*LISTENING" | head -n1 | awk '{print $NF}' || true
}

EXISTING_PID="$(port_pid)"
if [ -n "$EXISTING_PID" ]; then
  echo "이미 실행 중입니다 (포트 $PORT, PID $EXISTING_PID). 먼저 ./down.sh를 실행하세요."
  exit 1
fi

# apps/web/.env의 DATABASE_URL이 localhost/127.0.0.1을 가리키면 로컬 Docker Postgres를 쓰는 것으로 보고
# 기존처럼 컨테이너를 띄운다. Neon 등 원격 DB를 쓰는 중이면(이 환경처럼 Docker 자체가 안 되는 경우) 이 단계를 건너뛴다.
DB_URL="$(grep -m1 '^DATABASE_URL=' apps/web/.env 2>/dev/null | cut -d= -f2- | tr -d '"')"
case "$DB_URL" in
  *localhost*|*127.0.0.1*) USE_DOCKER=1 ;;
  *) USE_DOCKER=0 ;;
esac

if [ "$USE_DOCKER" = "1" ]; then
  echo "▶ Postgres 컨테이너 기동 중..."
  docker compose up -d db

  echo "▶ Postgres 준비 대기 중..."
  until docker compose exec -T db pg_isready -U planmap >/dev/null 2>&1; do
    sleep 1
  done
else
  echo "▶ DATABASE_URL이 원격 DB(예: Neon)를 가리키고 있어 Docker Postgres 기동을 건너뜁니다."
fi

echo "▶ 마이그레이션 적용 중..."
(cd apps/web && npx prisma migrate deploy)

echo "▶ Next.js dev 서버 기동 중... (로그: $LOG_FILE)"
nohup npm run dev --workspace=web > "$LOG_FILE" 2>&1 &
disown

echo "▶ 서버 준비 대기 중..."
for _ in $(seq 1 60); do
  if [ -n "$(port_pid)" ]; then
    break
  fi
  sleep 1
done
port_pid > "$PID_FILE" 2>/dev/null || true

echo "✅ 완료. http://localhost:3000"
echo "   로그 보기: tail -f $LOG_FILE"
echo "   내리기:   ./down.sh"
