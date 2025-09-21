#!/bin/bash

# 하나내비 시스템을 위한 모델 자동 설정 스크립트
# 폐쇄망 환경에서 필요한 LLM 모델들을 미리 다운로드

set -e

echo "🚀 하나내비 LLM 모델 설정 시작..."

# Ollama 서버가 준비될 때까지 대기
echo "⏳ Ollama 서버 연결 대기 중..."
while ! curl -s http://ollama:11434/api/tags > /dev/null; do
    echo "  Ollama 서버 대기 중... (10초 후 재시도)"
    sleep 10
done

echo "✅ Ollama 서버 연결 완료"

# 필요한 모델들 다운로드
MODELS=(
    "gemma3:12b"     # 기본 Judge 모델
    "gemma3:8b"      # 백업/경량 모델
    "mistral:7b"     # 대안 모델
)

for model in "${MODELS[@]}"; do
    echo "📥 모델 다운로드 중: $model"

    # 이미 존재하는지 확인
    if curl -s "http://ollama:11434/api/tags" | grep -q "\"name\":\"$model\""; then
        echo "  ✅ $model 이미 설치됨"
        continue
    fi

    # 모델 다운로드
    echo "  ⬇️  $model 다운로드 시작..."
    if curl -X POST "http://ollama:11434/api/pull" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$model\"}" \
        --max-time 3600 \
        --connect-timeout 30; then
        echo "  ✅ $model 다운로드 완료"
    else
        echo "  ❌ $model 다운로드 실패 (계속 진행)"
        continue
    fi

    # 간단한 테스트
    echo "  🧪 $model 테스트 중..."
    if curl -X POST "http://ollama:11434/api/generate" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"$model\",\"prompt\":\"Hello\",\"stream\":false}" \
        --max-time 60 > /dev/null; then
        echo "  ✅ $model 테스트 성공"
    else
        echo "  ⚠️  $model 테스트 실패 (모델은 설치됨)"
    fi
done

echo ""
echo "🎉 모델 설정 완료!"
echo ""
echo "📋 설치된 모델 목록:"
curl -s "http://ollama:11434/api/tags" | grep -o '"name":"[^"]*' | cut -d'"' -f4 | sed 's/^/  - /'

echo ""
echo "🌟 하나내비 시스템 준비 완료!"
echo "   웹 인터페이스: http://localhost:3000"
echo "   Ollama API: http://localhost:11434"