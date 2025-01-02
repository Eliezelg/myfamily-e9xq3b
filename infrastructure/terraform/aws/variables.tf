# Terraform configuration block specifying version constraints
terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Environment configuration
variable "environment" {
  type        = string
  description = "Deployment environment (production, staging, development)"
  default     = "production"

  validation {
    condition     = can(regex("^(production|staging|development)$", var.environment))
    error_message = "Environment must be production, staging, or development"
  }
}

# AWS Region configuration
variable "aws_region" {
  type        = string
  description = "AWS region for resource deployment"
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.aws_region))
    error_message = "AWS region must be in valid format (e.g., us-east-1)"
  }
}

# Availability Zones configuration
variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones for multi-AZ deployment"
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least two availability zones must be specified for high availability"
  }
}

# Project name configuration
variable "project" {
  type        = string
  description = "Project name for resource tagging"
  default     = "myfamily"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens"
  }
}

# Common resource tags
variable "common_tags" {
  type        = map(string)
  description = "Common tags to be applied to all resources"
  default = {
    Project     = "myfamily"
    ManagedBy   = "terraform"
    Owner       = "devops"
    Environment = "production"
  }
}

# Monitoring configuration
variable "enable_monitoring" {
  type        = bool
  description = "Enable enhanced monitoring and logging across services"
  default     = true
}

# Encryption configuration
variable "enable_encryption" {
  type        = bool
  description = "Enable encryption at rest for all supporting services"
  default     = true
}

# Backup retention configuration
variable "backup_retention_days" {
  type        = number
  description = "Default backup retention period in days"
  default     = 7

  validation {
    condition     = var.backup_retention_days >= 7
    error_message = "Backup retention must be at least 7 days"
  }
}

# Domain name configuration
variable "domain_name" {
  type        = string
  description = "Base domain name for the MyFamily platform"
  default     = "myfamily.com"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-\\.]{1,61}[a-z0-9]\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be in valid format"
  }
}