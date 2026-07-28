locals {
  name = "${var.project_name}-${var.environment}"

  common_tags = {
    Stack = "as-is"
  }
}
