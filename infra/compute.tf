resource "aws_instance" "service" {
  ami                         = data.aws_ami.amazon_linux_2023.id
  instance_type               = var.service_instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.service.id]
  iam_instance_profile        = aws_iam_instance_profile.service.name
  associate_public_ip_address = true
  user_data_replace_on_change = true

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size_gb
    encrypted             = true
    delete_on_termination = true
  }

  user_data = templatefile("${path.module}/templates/service-user-data.sh.tftpl", {
    aws_region      = var.aws_region
    parameter_name  = var.aladin_ttb_key_parameter_name
    repository_url  = var.backend_repository_url
    repository_ref  = var.backend_repository_ref
    frontend_origin = var.frontend_origin
    api_domain      = var.api_domain
  })

  tags = merge(local.common_tags, { Name = "${local.name}-service" })

  depends_on = [
    aws_iam_role_policy_attachment.service_ssm_core,
    aws_iam_role_policy.service_parameter,
  ]
}

resource "aws_instance" "observability" {
  ami                         = data.aws_ami.amazon_linux_2023.id
  instance_type               = var.observability_instance_type
  subnet_id                   = aws_subnet.private.id
  vpc_security_group_ids      = [aws_security_group.observability.id]
  iam_instance_profile        = aws_iam_instance_profile.observability.name
  associate_public_ip_address = false
  user_data_replace_on_change = true

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size_gb
    encrypted             = true
    delete_on_termination = true
  }

  user_data = templatefile("${path.module}/templates/observability-user-data.sh.tftpl", {
    service_private_ip = aws_instance.service.private_ip
  })

  tags = merge(local.common_tags, { Name = "${local.name}-observability" })

  depends_on = [
    aws_nat_gateway.main,
    aws_iam_role_policy_attachment.observability_ssm_core,
  ]
}
