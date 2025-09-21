# 하나내비 프론트엔드 폐쇄망 배포 가이드

이 문서는 인터넷이 완전히 단절된 환경(예: 사내 Zipbuntu)에서 하나내비 프론트엔드 UI를 실행하기 위한 절차를 설명합니다. 모든 의존성은 미리 패키징된 Docker 이미지를 활용하며, 추가 패키지 설치가 필요하지 않습니다.

## 1. 사전 준비 (인터넷 연결된 환경)

1. 저장소 루트에서 아래 스크립트를 실행해 오프라인용 이미지를 생성하고 번들로 압축합니다.

   ```bash
   ./scripts/package-offline-bundle.sh
   ```

   - `npm ci` → `npm run build` → `docker build` 순으로 실행되며, 결과물로 `hananav-offline-bundle.tar.gz`가 생성됩니다.
   - 기본 Docker 이미지 태그는 `web-hananav-front:offline` 입니다. 필요 시 `IMAGE_TAG` 환경변수로 변경 가능합니다.

2. 완성된 `hananav-offline-bundle.tar.gz` 파일을 폐쇄망으로 이동합니다. (사내 보안 정책에 맞는 매체 사용)

## 2. 폐쇄망 환경 준비

필수 요건:

- Docker Engine 20.10+ (Compose V2 포함)
- `tar`, `gzip`
- RAGFlow 및 Ollama 등 백엔드 서비스가 동일 머신 또는 네트워크에서 접근 가능해야 합니다.

## 3. 번들 풀기 및 이미지 로드

1. 번들을 작업 디렉터리로 복사한 뒤 압축을 해제합니다.

   ```bash
   tar -xzf hananav-offline-bundle.tar.gz
   cd hananav-offline-bundle
   ```

2. 포함된 Docker 이미지를 로드합니다.

   ```bash
   docker load -i images/web-hananav-front-offline.tar
   ```

   성공 시 `Loaded image: web-hananav-front:offline` 메시지가 표시됩니다.

## 4. 환경 변수 설정

1. 예시 환경파일을 복사합니다.

   ```bash
   cp .env.offline.example .env
   ```

2. `.env` 파일을 열어 실제 폐쇄망 정보를 입력합니다.

   - `VITE_RAGFLOW_BASE_URL`: 컨테이너에서 접근 가능한 RAGFlow 주소 (예: `http://host.docker.internal:7800`)
   - `VITE_RAGFLOW_API_KEY`: RAGFlow에서 발급받은 API 키
   - `VITE_OLLAMA_URL`: Ollama 엔드포인트 (평가 기능 비활성화 시 빈 값 또는 `false` 유지)
   - 기타 어시스턴트 ID, 리랭커 설정 등 필요에 따라 수정

   > **Linux 호스트 주의**: Docker Desktop이 아닌 순정 Docker라면 `host.docker.internal` 별칭이 없을 수 있습니다. 이 경우 `/etc/docker/daemon.json`에 `"hosts": ["tcp://0.0.0.0:2375", "unix:///var/run/docker.sock"]` 설정 또는 Compose 파일의 `extra_hosts`를 이용해 별도로 매핑하세요. (기본 Compose에는 `host-gateway` 매핑이 포함되어 있습니다.)

## 5. 서비스 기동

```bash
docker compose up -d
```

- 기본적으로 3000/tcp → 80 로 포워딩되어 있으므로 브라우저에서 `http://<호스트IP>:3000` 으로 접속합니다.
- 로그 확인: `docker compose logs -f`
- 중지: `docker compose down`

## 6. 구성 변경 & 재시작

환경 변수를 수정한 경우 컨테이너를 재시작하면 `/usr/share/nginx/html/env-config.js`가 새 값으로 재생성됩니다.

```bash
docker compose down
docker compose up -d
```

## 7. 번들 구성 설명

```
hananav-offline-bundle/
├── README_OFFLINE.md (본 문서)
├── docker-compose.yml
├── .env.offline.example
├── images/
│   └── web-hananav-front-offline.tar
└── scripts/
    └── load-image.sh (이미지 로드 보조 스크립트, 옵션)
```

## 8. 트러블슈팅

| 증상 | 조치 |
| --- | --- |
| UI 접속 시 빈 페이지 또는 502 | `docker compose logs`에서 `env-config` 생성 실패 메시지 확인, `.env` 값 재설정 |
| RAGFlow 연동 실패 | 컨테이너 내부에서 `curl $VITE_RAGFLOW_BASE_URL` 실행 (필요 시 `docker exec -it hananav-web-offline sh`) |
| 호스트 포트 충돌 | `.env` 파일의 `HANANAV_HTTP_PORT` 수정 후 재기동 |

필요 시 추가적인 백엔드 컴포넌트(RAGFlow, Ollama)를 별도로 컨테이너화하여 동일한 번들에 포함할 수 있습니다. 이 경우 `docker-compose.yml`에 해당 서비스를 추가하고, `.env` 값과 연계되도록 수정하십시오.
