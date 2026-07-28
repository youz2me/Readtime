# readtime — 책 완독 시간 예측 서비스

인프라 포트폴리오. **"고정 서버 vs 오토스케일링"**을 실제로 측정·비교하는 게 목표다.
서비스(책 완독 시간 예측)는 조연, 인프라가 주연.

## 모노레포 구조

```
readtime/
├── backend/    Node(Fastify) API + /metrics  ← 부하 대상, 판1 주연
├── frontend/   정적 프론트 → Vercel + 도메인 (AWS 밖)
└── infra/      Terraform (AWS VPC, EC2×2, NAT, SSM)  ← 판2에서 채움
```

배포는 셋으로 갈리지만(프론트=Vercel, 백=EC2, 인프라=Terraform), 저장소는 하나다.
"as-is → to-be" 진화가 커밋 로그로 남는 게 이 프로젝트의 기록 방식.

## 로드맵

- **판 1 (as-is)**: 고정 EC2 1대에 백엔드를 올리고 부하를 걸어 **언제 무너지는지** 측정.
- **판 2 (to-be)**: EKS 오토스케일링 + 로드밸런서 + `api.도메인`.

아키텍처 문서: 인프라 설계 아티팩트 참고.

## 지금 할 일 (로컬 리허설)

```bash
cd backend
npm install
npm run dev          # http://localhost:8080
```

세 가지 체크포인트:
1. **CPU 부하 경로** — `GET /internal/load?ms=200` 이 이벤트 루프를 태운다(스케일 실험용).
2. **/metrics** — `GET /metrics` 가 Prometheus 포맷 지표(프로세스 CPU/메모리/요청 지연)를 뱉는다.
3. **도커라이즈** — `docker build -t readtime-backend ./backend && docker run -p 8080:8080 readtime-backend`
