variable "project_name" {
  description = "Resource name prefix."
  type        = string
  default     = "readtime"
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "as-is"
}

variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "ap-northeast-2"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  type    = string
  default = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  type    = string
  default = "10.0.2.0/24"
}

variable "service_instance_type" {
  type    = string
  default = "t3.micro"
}

variable "observability_instance_type" {
  type    = string
  default = "t3.micro"
}

variable "backend_repository_url" {
  description = "Public Git repository cloned by the service instance."
  type        = string
  default     = "https://github.com/youz2me/Readtime.git"
}

variable "backend_repository_ref" {
  description = "Git branch or tag built on the service instance."
  type        = string
  default     = "main"
}

variable "api_domain" {
  description = "HTTPS hostname served by Caddy."
  type        = string
  default     = "api.youjinlee.com"
}

variable "frontend_origin" {
  description = "Allowed browser origin for CORS."
  type        = string
  default     = "https://readtime.youjinlee.com"
}

variable "route53_zone_id" {
  description = "Optional Route53 hosted zone ID. Leave empty for external DNS."
  type        = string
  default     = ""
}

variable "aladin_ttb_key_parameter_name" {
  description = "Existing SSM SecureString parameter containing the Aladin TTB key."
  type        = string
  default     = "/readtime/prod/aladin-ttb-key"
}

variable "root_volume_size_gb" {
  type    = number
  default = 16
}
