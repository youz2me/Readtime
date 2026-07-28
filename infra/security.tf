resource "aws_security_group" "service" {
  name        = "${local.name}-service"
  description = "Public HTTPS and private metrics access for Readtime API"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP for ACME redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS API"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description     = "Fastify metrics from observability instance only"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.observability.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${local.name}-service-sg" })
}

resource "aws_security_group" "observability" {
  name        = "${local.name}-observability"
  description = "No inbound access; use SSM port forwarding"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${local.name}-observability-sg" })
}
