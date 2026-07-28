output "service_public_ip" {
  description = "Point api_domain to this IP when Route53 is not managed here."
  value       = aws_eip.service.public_ip
}

output "service_private_ip" {
  value = aws_instance.service.private_ip
}

output "service_instance_id" {
  value = aws_instance.service.id
}

output "observability_instance_id" {
  value = aws_instance.observability.id
}

output "api_url" {
  value = "https://${var.api_domain}"
}

output "grafana_ssm_command" {
  value = "aws ssm start-session --target ${aws_instance.observability.id} --document-name AWS-StartPortForwardingSession --parameters '{\"portNumber\":[\"3000\"],\"localPortNumber\":[\"3000\"]}'"
}
