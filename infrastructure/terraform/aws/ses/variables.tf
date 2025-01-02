# AWS SES Variables Configuration
# Terraform Version: ~> 1.0

variable "domain_name" {
  type        = string
  description = "Primary domain name for SES email sending"
  validation {
    condition     = can(regex("^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$", var.domain_name))
    error_message = "Domain name must be a valid DNS domain name format."
  }
}

variable "mail_from_domain" {
  type        = string
  description = "Custom MAIL FROM domain for email sending"
  default     = "mail"
}

variable "notification_templates" {
  type = map(object({
    subject     = string
    html_body   = string
    text_body   = string
    language    = string
    charset     = optional(string, "UTF-8")
    is_default  = optional(bool, false)
  }))
  description = "Map of email notification templates with configurations"
  default = {
    default = {
      subject     = "MyFamily Notification"
      html_body   = "<h1>Default Notification</h1>"
      text_body   = "Default Notification"
      language    = "en"
      is_default  = true
    }
  }
}

variable "sender_email" {
  type        = string
  description = "Default sender email address for the system"
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.sender_email))
    error_message = "Sender email must be a valid email address format."
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment identifier (production, staging, development)"
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development."
  }
}

variable "enable_dkim" {
  type        = bool
  description = "Flag to enable DKIM for email authentication"
  default     = true
}

variable "reputation_metrics_enabled" {
  type        = bool
  description = "Flag to enable SES reputation metrics and monitoring"
  default     = true
}

variable "ses_region" {
  type        = string
  description = "AWS region for SES deployment"
  default     = "us-east-1"
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.ses_region))
    error_message = "SES region must be a valid AWS region format (e.g., us-east-1)."
  }
}

variable "feedback_forwarding" {
  type        = bool
  description = "Enable email feedback forwarding for bounce and complaint handling"
  default     = true
}