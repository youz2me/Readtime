data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "service" {
  name               = "${local.name}-service"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

resource "aws_iam_role_policy_attachment" "service_ssm_core" {
  role       = aws_iam_role.service.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "service_parameter" {
  statement {
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
    ]
    resources = [
      "arn:aws:ssm:${var.aws_region}:*:parameter${var.aladin_ttb_key_parameter_name}",
    ]
  }
}

resource "aws_iam_role_policy" "service_parameter" {
  name   = "${local.name}-read-aladin-key"
  role   = aws_iam_role.service.id
  policy = data.aws_iam_policy_document.service_parameter.json
}

resource "aws_iam_instance_profile" "service" {
  name = "${local.name}-service"
  role = aws_iam_role.service.name
}

resource "aws_iam_role" "observability" {
  name               = "${local.name}-observability"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

resource "aws_iam_role_policy_attachment" "observability_ssm_core" {
  role       = aws_iam_role.observability.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "observability" {
  name = "${local.name}-observability"
  role = aws_iam_role.observability.name
}
