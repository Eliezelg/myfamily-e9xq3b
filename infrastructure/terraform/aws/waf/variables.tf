# Terraform AWS WAF Variables
# terraform >= 1.0.0

variable "project_name" {
  type        = string
  description = "Name of the project for resource naming"
  default     = "myfamily"
}

variable "environment" {
  type        = string
  description = "Deployment environment (e.g., production, staging)"
  
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development"
  }
}

variable "waf_rate_limit" {
  type        = number
  description = "Rate limit for requests per 5-minute period per IP"
  default     = 1000

  validation {
    condition     = var.waf_rate_limit > 0
    error_message = "WAF rate limit must be greater than 0"
  }
}

variable "allowed_ip_ranges" {
  type        = list(string)
  description = "List of allowed IP CIDR ranges for administrative access"
  default     = []

  validation {
    condition     = alltrue([for ip in var.allowed_ip_ranges : can(cidrhost(ip, 0))])
    error_message = "All IP ranges must be valid CIDR notation"
  }
}

variable "geo_match_countries" {
  type        = list(string)
  description = "List of allowed country codes for geographic restriction"
  default     = ["IL", "US", "GB", "AU"]

  validation {
    condition     = alltrue([for country in var.geo_match_countries : length(country) == 2])
    error_message = "Country codes must be 2-letter ISO codes"
  }
}

variable "enable_logging" {
  type        = bool
  description = "Enable WAF logging to CloudWatch"
  default     = true
}

variable "log_retention_days" {
  type        = number
  description = "Number of days to retain WAF logs"
  default     = 30

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention days must be one of the allowed CloudWatch Logs retention periods"
  }
}

locals {
  resource_prefix = "${var.project_name}-${var.environment}"
}