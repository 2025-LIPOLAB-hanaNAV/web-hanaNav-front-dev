# 🐳 하나내비 폐쇄망 도커 배포 가이드

폐쇄망(인터넷 차단) 환경에서 하나내비 RAG 평가 시스템을 Docker Compose로 배포하는 방법입니다.

## 📋 시스템 요구사항

### 하드웨어
- **CPU**: 4코어 이상 권장 (LLM 추론용)
- **메모리**: 16GB 이상 필수 (Ollama 모델 로딩용)
- **스토리지**: 50GB 이상 (모델 파일 저장용)
- **GPU**: NVIDIA GPU 권장 (선택사항, 성능 향상)

### 소프트웨어
- Docker 20.10+
- Docker Compose 2.0+
- 리눅스/Windows/macOS 지원

## 🚀 빠른 시작

### 1. 프로젝트 복사
```bash
# 전체 프로젝트 폴더를 폐쇄망 서버로 복사
scp -r web-hanaNav-front/ user@server:/opt/hananav/
```

### 2. 데이터 디렉토리 생성
```bash
cd /opt/hananav/web-hanaNav-front
mkdir -p data/ollama
```

### 3. 시스템 시작
```bash
# 모든 서비스 시작 (백그라운드)
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 4. 모델 다운로드 대기
```bash
# 모델 설정 진행 상황 확인
docker-compose logs model-setup

# 완료까지 대기 (20-60분 소요)
```

### 5. 접속
- **웹 인터페이스**: http://localhost:3000
- **Ollama API**: http://localhost:11434

## 📦 서비스 구성

### 1. `hananav-web` - 웹 애플리케이션
- **포트**: 3000
- **기능**: React 기반 RAG 평가 대시보드
- **의존성**: ollama 서비스

### 2. `ollama` - LLM 서버
- **포트**: 11434
- **기능**: Gemma3, Mistral 모델 호스팅
- **스토리지**: `./data/ollama` (영구 저장)

### 3. `model-setup` - 모델 초기화
- **실행**: 1회성 (시스템 최초 시작 시)
- **기능**: 필요한 LLM 모델 자동 다운로드

## 🔧 설정 커스터마이징

### 환경 변수 수정
```bash
# docker-compose.yml에서 수정 가능
environment:
  - VITE_OLLAMA_URL=http://ollama:11434
  - VITE_ENABLE_RAG_EVALUATION=true
  - VITE_JUDGE_MODEL=gemma3:12b
  - VITE_RAG_MODEL=gemma3:8b
```

### 모델 변경
```bash
# scripts/setup-models.sh 수정
MODELS=(
    "gemma3:12b"     # 기본 Judge 모델
    "gemma3:8b"      # 경량 모델
    "llama3.1:8b"    # 대안 모델 추가
)
```

### 포트 변경
```bash
# docker-compose.yml에서 수정
ports:
  - "8080:80"      # 웹 포트
  - "11435:11434"  # Ollama 포트
```

## 🛠️ 운영 관리

### 서비스 상태 확인
```bash
# 전체 서비스 상태
docker-compose ps

# 헬스체크 확인
docker-compose exec ollama curl http://localhost:11434/api/tags
docker-compose exec hananav-web curl http://localhost/health
```

### 로그 모니터링
```bash
# 실시간 로그 (전체)
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f ollama
docker-compose logs -f hananav-web
```

### 시스템 재시작
```bash
# 전체 재시작
docker-compose restart

# 특정 서비스 재시작
docker-compose restart hananav-web
```

### 데이터 백업
```bash
# Ollama 모델 데이터 백업
tar -czf ollama-models-backup.tar.gz data/ollama/

# 전체 시스템 백업
tar -czf hananav-full-backup.tar.gz . --exclude=data/ollama/blobs
```

## 🚨 문제 해결

### 1. 메모리 부족
```bash
# Ollama 메모리 제한 설정
echo "OLLAMA_MAX_LOADED_MODELS=1" >> .env
docker-compose down && docker-compose up -d
```

### 2. 모델 다운로드 실패
```bash
# 수동 모델 다운로드
docker-compose exec ollama ollama pull gemma3:12b
```

### 3. 네트워크 연결 문제
```bash
# 컨테이너 네트워크 확인
docker network inspect web-hananav-front_hananav-network

# DNS 확인
docker-compose exec hananav-web nslookup ollama
```

### 4. 권한 오류
```bash
# 데이터 디렉토리 권한 수정
sudo chown -R 1001:1001 data/ollama
```

## 🔐 보안 고려사항

### 1. 네트워크 격리
- 컨테이너 간 통신은 내부 네트워크 사용
- 외부 노출 포트 최소화

### 2. 데이터 보호
- 민감한 평가 데이터는 로컬 스토리지만 사용
- 외부 API 호출 없음

### 3. 접근 제어
```bash
# 필요시 nginx에서 기본 인증 추가
# nginx.conf에 auth_basic 설정 가능
```

## 📊 성능 최적화

### GPU 활용 (NVIDIA)
```yaml
# docker-compose.yml에 추가
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

### 메모리 튜닝
```bash
# .env 파일 생성
echo "OLLAMA_KEEP_ALIVE=5m" > .env
echo "OLLAMA_MAX_LOADED_MODELS=2" >> .env
```

## 🔄 업데이트 및 유지보수

### 이미지 업데이트
```bash
# 새 버전 배포
docker-compose pull
docker-compose up -d
```

### 모델 추가
```bash
# 새 모델 수동 추가
docker-compose exec ollama ollama pull qwen2.5:7b
```

이제 폐쇄망 환경에서 하나내비 시스템을 안정적으로 운영할 수 있습니다! 🎉