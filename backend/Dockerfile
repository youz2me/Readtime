# ---- 의존성 설치 단계 ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# 운영 의존성만 설치 (이미지 가볍게)
RUN npm install --omit=dev --no-audit --no-fund

# ---- 런타임 단계 ----
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

EXPOSE 8080
# 루트가 아닌 기본 제공 node 유저로 실행 (보안)
USER node

# 컨테이너 자체 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
