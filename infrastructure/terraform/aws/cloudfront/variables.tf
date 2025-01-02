# Import required variables from parent module
variable "aws_region" {
  type        = string
  description = "AWS region for resource deployment"
}

variable "environment" {
  type        = string
  description = "Deployment environment (production, staging, development)"
}

# CloudFront price class configuration
variable "price_class" {
  type        = string
  description = "CloudFront distribution price class determining edge locations"
  default     = "PriceClass_200"

  validation {
    condition     = can(regex("^PriceClass_(100|200|All)$", var.price_class))
    error_message = "Price class must be one of PriceClass_100, PriceClass_200, or PriceClass_All"
  }
}

# Geographic restriction configuration
variable "allowed_locations" {
  type        = list(string)
  description = "List of allowed geographic locations for content delivery"
  default     = ["IL", "EU", "US", "CA", "AU"]

  validation {
    condition     = length(var.allowed_locations) > 0
    error_message = "At least one geographic location must be specified"
  }
}

# Media content cache TTL settings
variable "media_cache_ttl" {
  type = object({
    min_ttl     = number
    default_ttl = number
    max_ttl     = number
  })
  description = "Cache TTL settings for media content"
  default = {
    min_ttl     = 0
    default_ttl = 86400    # 24 hours
    max_ttl     = 31536000 # 1 year
  }

  validation {
    condition     = var.media_cache_ttl.min_ttl >= 0
    error_message = "Minimum TTL must be non-negative"
  }

  validation {
    condition     = var.media_cache_ttl.default_ttl >= var.media_cache_ttl.min_ttl
    error_message = "Default TTL must be greater than or equal to minimum TTL"
  }

  validation {
    condition     = var.media_cache_ttl.max_ttl >= var.media_cache_ttl.default_ttl
    error_message = "Maximum TTL must be greater than or equal to default TTL"
  }
}

# Gazette PDF cache TTL settings
variable "gazette_cache_ttl" {
  type = object({
    min_ttl     = number
    default_ttl = number
    max_ttl     = number
  })
  description = "Cache TTL settings for gazette PDFs"
  default = {
    min_ttl     = 0
    default_ttl = 604800   # 1 week
    max_ttl     = 31536000 # 1 year
  }

  validation {
    condition     = var.gazette_cache_ttl.min_ttl >= 0
    error_message = "Minimum TTL must be non-negative"
  }

  validation {
    condition     = var.gazette_cache_ttl.default_ttl >= var.gazette_cache_ttl.min_ttl
    error_message = "Default TTL must be greater than or equal to minimum TTL"
  }

  validation {
    condition     = var.gazette_cache_ttl.max_ttl >= var.gazette_cache_ttl.default_ttl
    error_message = "Maximum TTL must be greater than or equal to default TTL"
  }
}

# SSL/TLS configuration
variable "ssl_protocol_version" {
  type        = string
  description = "Minimum TLS version for viewer connections"
  default     = "TLSv1.2_2021"

  validation {
    condition     = can(regex("^TLSv1\\.[2-3]_\\d{4}$", var.ssl_protocol_version))
    error_message = "SSL protocol version must be TLSv1.2_2021 or higher for security compliance"
  }
}

# Resource tagging
variable "tags" {
  type        = map(string)
  description = "Additional tags for CloudFront distribution"
  default = {
    Service    = "CDN"
    Component  = "CloudFront"
  }
}