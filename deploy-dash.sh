#!/bin/bash
# omni-dashboard를 빌드하고 Firebase Hosting에 배포하는 스크립트입니다.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARD_DIR="$SCRIPT_DIR/omni-dashboard"

echo "========================================"
echo "Omni Dashboard Firebase 배포 시작"
echo "========================================"

if [ ! -d "$DASHBOARD_DIR" ]; then
    echo "❌ omni-dashboard 디렉토리를 찾을 수 없습니다: $DASHBOARD_DIR"
    exit 1
fi

cd "$DASHBOARD_DIR"

echo ""
echo "1. 의존성 설치 확인 중..."
if [ ! -d "node_modules" ]; then
    echo "   node_modules 없음 → npm install 실행"
    npm install
else
    echo "   ✅ node_modules 존재"
fi

echo ""
echo "2. 프로덕션 빌드 중..."
npm run build
echo "   ✅ 빌드 완료 → omni-dashboard/dist"

echo ""
echo "3. Firebase Hosting 배포 중..."

if ! command -v firebase &>/dev/null; then
    echo "❌ firebase CLI가 설치되어 있지 않습니다."
    echo "   설치: npm install -g firebase-tools"
    exit 1
fi

firebase deploy --only hosting --project omnibot-1210

echo ""
echo "========================================"
echo "✅ Omni Dashboard 배포 완료!"
echo "   https://omnibot-1210.web.app"
echo "========================================"
