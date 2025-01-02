# AWS Provider configuration
# version: ~> 4.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Local variables for resource naming and tagging
locals {
  resource_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# WAF Web ACL configuration for CloudFront
resource "aws_wafv2_web_acl" "main" {
  name        = "${local.resource_prefix}-waf"
  description = "WAF rules for MyFamily platform"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rate-based protection rule
  rule {
    name     = "RateBasedProtection"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateBasedProtectionMetric"
      sampled_requests_enabled  = true
    }
  }

  # SQL Injection protection rule
  rule {
    name     = "SQLInjectionProtection"
    priority = 2

    override_action {
      none {}
    }

    statement {
      sql_injection_match_statement {
        field_to_match {
          body {}
          query_string {}
          uri_path {}
        }

        text_transformation {
          priority = 1
          type     = "URL_DECODE"
        }

        text_transformation {
          priority = 2
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "SQLInjectionProtectionMetric"
      sampled_requests_enabled  = true
    }
  }

  # Geographic restriction rule
  rule {
    name     = "GeoRestriction"
    priority = 3

    override_action {
      none {}
    }

    statement {
      geo_match_statement {
        country_codes = ["IL", "US", "CA", "GB", "FR", "DE", "AU"]
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "GeoRestrictionMetric"
      sampled_requests_enabled  = true
    }
  }

  # Cross-site scripting (XSS) protection rule
  rule {
    name     = "XSSProtection"
    priority = 4

    override_action {
      none {}
    }

    statement {
      xss_match_statement {
        field_to_match {
          body {}
          query_string {}
          uri_path {}
        }

        text_transformation {
          priority = 1
          type     = "URL_DECODE"
        }

        text_transformation {
          priority = 2
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "XSSProtectionMetric"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "${local.resource_prefix}-waf-main"
    sampled_requests_enabled  = true
  }

  tags = local.common_tags
}

# CloudWatch Log Group for WAF logs
resource "aws_cloudwatch_log_group" "waf_logs" {
  name              = "/aws/waf/${local.resource_prefix}"
  retention_in_days = 90
  tags              = local.common_tags
}

# WAF logging configuration
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [aws_cloudwatch_log_group.waf_logs.arn]
  resource_arn           = aws_wafv2_web_acl.main.arn

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }
}

# WAF Web ACL association with CloudFront
resource "aws_wafv2_web_acl_association" "cloudfront" {
  resource_arn = data.aws_cloudfront_distribution.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# Data source for CloudFront distribution
data "aws_cloudfront_distribution" "main" {
  id = var.cloudfront_distribution_id
}

# Outputs
output "web_acl_id" {
  description = "WAF Web ACL ID for CloudFront association"
  value       = aws_wafv2_web_acl.main.id
}

output "web_acl_arn" {
  description = "WAF Web ACL ARN for logging configuration"
  value       = aws_wafv2_web_acl.main.arn
}