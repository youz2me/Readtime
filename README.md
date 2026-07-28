# Readtime

개인의 읽기 속도와 책 정보를 바탕으로 예상 완독 시간을 계산하는 서비스입니다.
짧은 장르별 글로 읽기 속도를 측정하고, 알라딘 OpenAPI에서 가져온 도서의
페이지 수와 카테고리를 함께 반영해 예상 시간과 범위를 보여줍니다.

## 서비스 기능

- 장르별 예시 글을 활용한 개인 읽기 속도 측정
- 알라딘 OpenAPI 기반 도서 검색, 베스트셀러 및 상세 정보 조회
- 페이지 수, 도서 카테고리, 읽기 속도를 반영한 완독 시간 예측
- 선택한 책과 비슷한 도서 추천
- 페이지 정보가 없거나 그림 비중이 높은 도서의 측정 제한 안내

## 인프라 설계

```mermaid
flowchart TB
    User([사용자])

    subgraph Edge["웹 서비스"]
        direction LR
        Frontend["▲ Vercel<br/><b>readtime.youjinlee.com</b>"]
        DNS["Gabia DNS<br/><b>api.youjinlee.com</b>"]
        Frontend -->|"HTTPS API 요청"| DNS
    end

    subgraph AWS["AWS · ap-northeast-2"]
        direction TB

        subgraph VPC["VPC · 10.0.0.0/16"]
            direction LR

            subgraph Public["Public Subnet · 10.0.1.0/24"]
                Service["EC2 · Docker<br/><b>Caddy + Fastify API</b><br/>Elastic IP"]
            end

            subgraph Private["Private Subnet · 10.0.2.0/24"]
                direction TB
                Prometheus["Prometheus<br/><small>metrics collection</small>"]
                Grafana["Grafana<br/><small>dashboard</small>"]
                Grafana --> Prometheus
            end

            Prometheus -.->|"GET /metrics · :8080"| Service
        end

        Parameter["🔐 SSM Parameter Store<br/><small>Aladin API Key</small>"] -.-> Service
        Session["SSM Session Manager"] -.->|"port forwarding · :3000"| Grafana
    end

    Admin([운영자]) -.-> Session
    User --> Frontend
    DNS -->|"HTTPS · :443"| Service

    classDef user fill:#111827,color:#fff,stroke:#111827,stroke-width:2px;
    classDef edge fill:#fff7ed,color:#9a3412,stroke:#fb923c,stroke-width:1.5px;
    classDef service fill:#eff6ff,color:#1e3a8a,stroke:#3b82f6,stroke-width:2px;
    classDef observe fill:#f0fdf4,color:#166534,stroke:#22c55e,stroke-width:1.5px;
    classDef secure fill:#faf5ff,color:#6b21a8,stroke:#a855f7,stroke-width:1.5px;

    class User,Admin user;
    class Frontend,DNS edge;
    class Service service;
    class Prometheus,Grafana observe;
    class Parameter,Session secure;

    style Edge fill:#fffbeb,stroke:#fed7aa,stroke-width:1px
    style AWS fill:#f8fafc,stroke:#94a3b8,stroke-width:2px
    style VPC fill:#ffffff,stroke:#cbd5e1,stroke-width:1.5px
    style Public fill:#eff6ff,stroke:#93c5fd,stroke-dasharray:5 3
    style Private fill:#f0fdf4,stroke:#86efac,stroke-dasharray:5 3
```

프론트엔드는 Vercel에서 제공하고, 백엔드는 AWS 퍼블릭 서브넷의 EC2에서 Docker
컨테이너로 실행합니다. Caddy가 HTTPS 인증서와 리버스 프록시를 담당하며 서비스
EC2에는 Elastic IP를 연결해 고정된 API 주소를 유지합니다.

Prometheus와 Grafana는 별도의 프라이빗 EC2에서 실행합니다. Prometheus는
Fastify의 요청 수와 응답 시간, 프로세스 지표를 수집하고 Grafana는 SSM 포트
포워딩을 통해서만 접근할 수 있습니다. 알라딘 API 키는 SSM Parameter Store의
SecureString으로 관리합니다.

AWS 네트워크, 보안 그룹, IAM, EC2 및 관측 환경은 Terraform으로 관리합니다.

## 기술 구성

| 영역 | 기술 |
| --- | --- |
| Frontend | Next.js, TypeScript, Vercel |
| Backend | Node.js, Fastify, Docker |
| Book data | Aladin OpenAPI |
| Infrastructure | AWS VPC, EC2, Elastic IP, SSM, Terraform |
| Observability | Prometheus, Grafana |
