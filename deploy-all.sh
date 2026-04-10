#!/bin/bash
# 🚀 Omni Ecosystem 통합 배포 스크립트 (Bot + Dashboard)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_DIR="$SCRIPT_DIR/omni-bot"
DASH_DIR="$SCRIPT_DIR/omni-dashboard"

echo "========================================"
echo "   Omni Ecosystem 통합 배포 시작"
echo "========================================"

# 환경 변수 파일 확인
if [ ! -f "$BOT_DIR/.env" ] || [ ! -f "$DASH_DIR/.env" ]; then
    echo "❌ 환경 변수 파일이 없습니다. 설정을 먼저 완료해주세요."
    exit 1
fi

# omni-bot 배포
cd "$BOT_DIR"
docker build -t omni-bot:latest .
docker stop omni-bot >/dev/null 2>&1 || true
docker rm omni-bot >/dev/null 2>&1 || true
docker run -d --name omni-bot --net=host --env-file .env omni-bot:latest
docker image prune -f >/dev/null 2>&1

# omni-dashboard 배포
cd "$DASH_DIR"
npm install --silent
npm run build --silent
firebase deploy --only hosting --project omnibot-1210

echo "✅ 전체 배포 완료!"
