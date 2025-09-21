# 멀티 스테이지 빌드로 최적화된 폐쇄망 도커 이미지

# Stage 1: 의존성 설치 및 빌드
FROM node:18-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치 (캐시 최적화)
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 프로덕션 빌드
RUN npm run build

# Stage 2: 프로덕션 런타임
FROM nginx:alpine

# 보안을 위해 non-root 사용자 생성
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Nginx 설정 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 커스텀 nginx 설정
COPY nginx.conf /etc/nginx/nginx.conf

# 권한 설정
RUN chown -R nextjs:nodejs /usr/share/nginx/html && \
    chown -R nextjs:nodejs /var/cache/nginx && \
    chown -R nextjs:nodejs /var/log/nginx && \
    chown -R nextjs:nodejs /etc/nginx/conf.d

# 실행 시 필요한 디렉토리 생성
RUN touch /var/run/nginx.pid && \
    chown -R nextjs:nodejs /var/run/nginx.pid

# 포트 노출
EXPOSE 80

# non-root 사용자로 전환
USER nextjs

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# nginx 시작
CMD ["nginx", "-g", "daemon off;"]