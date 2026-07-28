# Readtime as-is AWS infrastructure

`docs/architecture.html`의 판 1 구조를 Terraform으로 만든다.

- VPC `10.0.0.0/16`
- 퍼블릭 서브넷: Fastify 서비스 EC2 + NAT Gateway
- 프라이빗 서브넷: Prometheus + Grafana 관측 EC2
- 서비스 접근: `https://api.youjinlee.com` → Caddy → Fastify `:8080`
- 관측 접근: SSM Session Manager 포트 포워딩
- 알라딘 키: Terraform 변수가 아니라 SSM Parameter Store `SecureString`

## 사전 준비

AWS 자격 증명과 Terraform 1.6 이상이 필요하다. 알라딘 키는 state에 남기지 않도록 먼저 별도로 등록한다.

```bash
aws ssm put-parameter \
  --region ap-northeast-2 \
  --name /readtime/prod/aladin-ttb-key \
  --type SecureString \
  --value '발급받은_TTB_KEY'
```

설정 파일을 만든다.

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars`에서 `api_domain`, `frontend_origin`, 필요하면 `route53_zone_id`를 수정한다.

## 검토와 생성

```bash
terraform init
terraform fmt -check
terraform validate
terraform plan
terraform apply
```

`route53_zone_id`를 비워두면 DNS 레코드는 생성하지 않는다. 이 경우 출력된 `service_public_ip`를 이용해 DNS 제공자에서 `api` A 레코드를 직접 만든다. DNS가 전파되면 Caddy가 인증서를 자동 발급한다.

## Grafana 접속

출력된 관측 인스턴스 ID를 사용한다.

```bash
aws ssm start-session \
  --target INSTANCE_ID \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["3000"],"localPortNumber":["3000"]}'
```

그 후 `http://localhost:3000`에 접속한다. 초기 계정은 `admin / admin`이며 첫 로그인 때 변경한다.

## 비용 주의

NAT Gateway와 Elastic IP는 실행 시간 및 트래픽에 따라 비용이 발생한다. 실험이 끝나면 반드시 `terraform destroy`로 제거한다.
