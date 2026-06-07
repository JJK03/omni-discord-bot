#!/bin/bash
# omni-bot 컨테이너를 빌드하고 재시작하는 스크립트입니다.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_DIR="$SCRIPT_DIR/omni-bot"

echo "========================================"
echo "재배포 시작: omni-bot"
echo "========================================"

cd "$BOT_DIR"

echo "1. 새로운 이미지 빌드 중..."
docker build -t omni-bot:latest .

echo "2. 기존 컨테이너 중지 및 삭제..."
docker stop omni-bot >/dev/null 2>&1 || true
docker rm omni-bot >/dev/null 2>&1 || true

echo "3. 새 컨테이너 실행 중..."
docker run -d --name omni-bot --net=host --env-file .env omni-bot:latest

echo "4. 슬래시 커맨드 등록 중..."
npm run deploy-commands

echo "5. 불필요한 빌드 부산물 정리 중..."
docker image prune -f >/dev/null 2>&1

echo ""
echo "========================================"
echo "✅ omni-bot 배포 완료!"
echo "========================================"
