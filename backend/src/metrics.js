// Prometheus 지표 정의.
// 판2에서 관측 서버(Prometheus)가 여기 /metrics 를 긁어가고, CPU 지표로 오토스케일링을 건다.
import client from 'prom-client';

export const register = new client.Registry();
register.setDefaultLabels({ app: 'readtime-backend' });

// 프로세스 기본 지표 자동 수집: CPU, 메모리, 이벤트 루프 지연 등.
// 부하 실험의 핵심 지표(process_cpu_seconds_total, nodejs_eventloop_lag_seconds)가 여기서 나온다.
client.collectDefaultMetrics({ register });

// 요청 처리 시간 히스토그램 — "언제 느려지는가"를 본다.
export const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP 요청 처리 시간(초)',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// 요청 수 카운터 — 처리량(throughput)과 에러율을 본다.
export const httpTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP 요청 총 수',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});
