import Fastify, { LogController } from 'fastify';
import cors from '@fastify/cors';
import { register, httpDuration, httpTotal } from './metrics.js';
import { predict } from './predict.js';
import { listBestsellers, lookupBook, searchBooks } from './aladin.js';

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0'; // 컨테이너에서 외부 접근 가능하게
const USE_MOCK = process.env.USE_MOCK === '1';

// 문자열 로그 레벨을 포함한 JSON 로그를 출력해 Loki/Grafana에서 바로 분류할 수 있게 한다.
const app = Fastify({
  logController: new LogController({ disableRequestLogging: true }),
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  },
});

await app.register(cors, {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000'],
  methods: ['GET', 'POST'],
});

// --- 지표 수집 훅: 모든 요청의 지연/카운트를 기록 ---
app.addHook('onRequest', (req, _reply, done) => {
  req.startAt = process.hrtime.bigint();
  done();
});
app.addHook('onResponse', (req, reply, done) => {
  if (typeof req.startAt !== 'bigint') {
    done();
    return;
  }
  const route = req.routeOptions?.url ?? req.url;
  const statusCode = reply.statusCode;
  const status = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'success';
  const message = req.requestError?.message ?? `${req.method} ${route} ${statusCode}`;
  const trafficSource = route === '/healthz' || route === '/metrics' || route.startsWith('/internal/')
    ? 'system'
    : req.headers['x-traffic-source'] === 'manual'
      ? 'manual'
      : 'user';
  const labels = { method: req.method, route, status: statusCode };
  const seconds = Number(process.hrtime.bigint() - req.startAt) / 1e9;
  httpDuration.observe(labels, seconds);
  httpTotal.inc(labels);
  const log = {
    status,
    statusCode,
    message,
    method: req.method,
    route,
    trafficSource,
    responseTime: Math.round(seconds * 1000 * 100) / 100,
  };
  if (statusCode >= 500) req.log.error(log);
  else if (statusCode >= 400) req.log.warn(log);
  else req.log.info(log);
  done();
});

app.addHook('onError', (req, _reply, error, done) => {
  req.requestError = error;
  done();
});

// --- 헬스체크 ---
app.get('/healthz', async () => ({ status: 'ok' }));

// --- Prometheus 지표 노출 (체크포인트 ②) ---
app.get('/metrics', async (_req, reply) => {
  reply.header('Content-Type', register.contentType);
  return register.metrics();
});

// --- 책 검색 ---
app.get('/api/search', async (req) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) return { items: [] };
  const items = await searchBooks(q, { useMock: USE_MOCK, ttbKey: process.env.ALADIN_TTB_KEY });
  return { query: q, count: items.length, items };
});

app.get('/api/bestsellers', async () => {
  const items = await listBestsellers({ useMock: USE_MOCK, ttbKey: process.env.ALADIN_TTB_KEY });
  return { count: items.length, items };
});

app.get('/api/books/:isbn', async (req, reply) => {
  const isbn = String(req.params.isbn ?? '').trim();
  if (!/^\d{10,13}$/.test(isbn)) return reply.code(400).send({ message: '올바른 ISBN이 필요합니다.' });

  const item = await lookupBook(isbn, { useMock: USE_MOCK, ttbKey: process.env.ALADIN_TTB_KEY });
  if (!item) return reply.code(404).send({ message: '책 정보를 찾지 못했습니다.' });
  return { item };
});

// --- 완독 시간 예측 ---
app.post(
  '/api/predict',
  {
    schema: {
      body: {
        type: 'object',
        required: ['pages'],
        properties: {
          pages: { type: 'number', minimum: 1 },
          category: { type: 'string' },
          cpm: { type: 'number', minimum: 1 },
          favorites: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  async (req) => predict(req.body),
);

// --- CPU 부하 경로 (체크포인트 ①) ---
// 스케일 실험 전용. 제품 기능이 아니라 "재현 가능한 CPU 부하 훅"임을 명시한다.
// 동기 busy-loop라 이벤트 루프를 블로킹 → t3.micro 단일 vCPU 포화를 확실히 재현.
if (process.env.ENABLE_LOAD_ENDPOINT !== '0') {
  app.get('/internal/load', async (req) => {
    const ms = Math.min(Math.max(Number(req.query.ms ?? 50), 1), 2000);
    const end = Date.now() + ms;
    let sink = 0;
    while (Date.now() < end) sink += Math.sqrt(Math.random());
    return { burnedMs: ms, sink };
  });
}

app
  .listen({ port: PORT, host: HOST })
  .then(() => app.log.info({
    status: 'success',
    statusCode: 200,
    message: `readtime-backend up (mock=${USE_MOCK})`,
  }))
  .catch((err) => {
    app.log.error({
      status: 'error',
      statusCode: 500,
      message: err.message,
      err,
    });
    process.exit(1);
  });

// 컨테이너 종료 시그널을 받아 깔끔히 닫는다 (graceful shutdown)
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    app.log.info({
      status: 'success',
      statusCode: 200,
      message: `${sig} 수신 — 종료`,
    });
    await app.close();
    process.exit(0);
  });
}
