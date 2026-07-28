# infra (자리표시자)

Terraform(IaC)로 AWS 인프라를 관리한다. 콘솔 수동 클릭은 처음 감만 잡고, 관리는 코드로.

## 판1 (as-is) 구성 대상
- VPC `10.0.0.0/16`, 퍼블릭/프라이빗 서브넷, IGW, NAT Gateway, 라우팅 테이블
- 서비스 EC2(퍼블릭, t3.micro) — 백엔드 컨테이너, 부하 대상
- 관측 EC2(프라이빗, t3.micro) — Prometheus + Grafana, 접근은 SSM
- 보안 그룹: 서비스는 앱 포트/`/metrics`, 관측은 인바운드 최소화

## 판2 (to-be)
- EKS + 오토스케일링(CPU 기준), ALB, `api.도메인`

## 직접 세팅 시 약속
1. 만든 리소스 즉시 기록  2. 안 쓰면 끄기  3. 루트 대신 IAM 유저
