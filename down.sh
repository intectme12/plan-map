#!/usr/bin/env bash
# up.sh로 띄운 Next.js dev 서버와 Postgres 컨테이너를 내린다.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

PID_FILE=".dev-server.pid"
PORT=3000

# Git Bash의 `$!`(MSYS 내부 PID)는 실제 Windows PID와 안 맞아 kill/taskkill 대상을 못 찾는 경우가 있어
# (up.sh가 그 PID로 기록한 .dev-server.pid도 마찬가지), 포트를 실제로 점유 중인 프로세스를 찾아 종료한다.
PID="$(netstat -ano 2>/dev/null | grep -E ":$PORT[[:space:]].*LISTENING" | head -n1 | awk '{print $NF}' || true)"

if [ -n "$PID" ]; then
  echo "▶ Next.js dev 서버 종료 중... (포트 $PORT, PID $PID)"
  # /T로 프로세스 트리 전체(npm이 띄운 자식 node.exe 포함)를 종료해야 실제로 포트가 풀린다.
  taskkill //PID "$PID" //T //F >/dev/null 2>&1 || true
else
  echo "포트 $PORT에서 실행 중인 서버가 없습니다 (이미 내려갔거나 다른 방식으로 실행됨)."
fi
rm -f "$PID_FILE"

# up.sh와 같은 기준: 로컬 Docker Postgres를 쓰는 중일 때만 컨테이너를 내린다.
DB_URL="$(grep -m1 '^DATABASE_URL=' apps/web/.env 2>/dev/null | cut -d= -f2- | tr -d '"')"
case "$DB_URL" in
  *localhost*|*127.0.0.1*)
    echo "▶ Postgres 컨테이너 정지 중..."
    docker compose stop db
    ;;
  *)
    echo "▶ DATABASE_URL이 원격 DB(예: Neon)를 가리키고 있어 Docker 정지 단계를 건너뜁니다."
    ;;
esac

echo "✅ 완료."
