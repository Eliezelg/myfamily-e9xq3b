# AWS SES Configuration for MyFamily Platform
# Terraform Version: >= 1.0.0
# Provider Version: hashicorp/aws ~> 4.0

terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Primary SES Domain Identity Configuration
resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "${var.environment}-ses-domain"
    Environment = var.environment
  }
}

# DKIM Configuration for Enhanced Email Authentication
resource "aws_ses_domain_dkim" "main" {
  count  = var.enable_dkim ? 1 : 0
  domain = aws_ses_domain_identity.main.domain
}

# Custom MAIL FROM Domain Configuration
resource "aws_ses_mail_from_domain" "main" {
  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = "${var.mail_from_domain}.${var.domain_name}"

  behavior_on_mx_failure = "UseDefaultValue"

  lifecycle {
    prevent_destroy = true
  }
}

# SES Configuration Set with Enhanced Monitoring
resource "aws_ses_configuration_set" "main" {
  name = "${var.environment}-email-config"

  reputation_metrics_enabled = var.reputation_metrics_enabled
  sending_enabled           = true

  delivery_options {
    tls_policy = "Require"
  }

  tags = {
    Environment = var.environment
  }
}

# CloudWatch Event Destination for Email Tracking
resource "aws_ses_event_destination" "cloudwatch" {
  name                   = "${var.environment}-email-events"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled               = true
  matching_types        = ["send", "reject", "bounce", "complaint", "delivery"]

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "email_type"
    value_source   = "messageTag"
  }
}

# Email Templates Configuration
resource "aws_ses_template" "notifications" {
  for_each = var.notification_templates

  name    = "${var.environment}-${each.key}"
  subject = each.value.subject
  html    = each.value.html_body
  text    = each.value.text_body

  lifecycle {
    create_before_destroy = true
  }
}

# SES Receipt Rule Set
resource "aws_ses_receipt_rule_set" "main" {
  rule_set_name = "${var.environment}-rules"
}

# SES Identity Notification Topic
resource "aws_ses_identity_notification_topic" "bounces" {
  identity          = aws_ses_domain_identity.main.domain
  notification_type = "Bounce"
  include_original_headers = true
}

resource "aws_ses_identity_notification_topic" "complaints" {
  identity          = aws_ses_domain_identity.main.domain
  notification_type = "Complaint"
  include_original_headers = true
}

# SES Identity Policy
resource "aws_ses_identity_policy" "main" {
  identity = aws_ses_domain_identity.main.arn
  name     = "${var.environment}-ses-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = aws_ses_domain_identity.main.arn
        Condition = {
          StringEquals = {
            "aws:PrincipalOrgID" = data.aws_organizations_organization.current.id
          }
        }
      }
    ]
  })
}

# Data source for AWS Organization ID
data "aws_organizations_organization" "current" {}

# SES Domain MAIL FROM MX Record Validation
resource "aws_route53_record" "ses_domain_mail_from_mx" {
  count   = var.feedback_forwarding ? 1 : 0
  zone_id = data.aws_route53_zone.main.zone_id
  name    = aws_ses_mail_from_domain.main.mail_from_domain
  type    = "MX"
  ttl     = "600"
  records = ["10 feedback-smtp.${var.ses_region}.amazonses.com"]
}

# Data source for Route53 zone
data "aws_route53_zone" "main" {
  name = var.domain_name
}

# Output values for reference
output "ses_domain_identity_arn" {
  value       = aws_ses_domain_identity.main.arn
  description = "ARN of the SES domain identity"
}

output "ses_configuration_set_name" {
  value       = aws_ses_configuration_set.main.name
  description = "Name of the SES configuration set"
}

output "dkim_tokens" {
  value       = try(aws_ses_domain_dkim.main[0].dkim_tokens, [])
  description = "DKIM tokens for domain verification"
  sensitive   = true
}