terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment (production, staging, development)"
  validation {
    condition     = can(regex("^(production|staging|development)$", var.environment))
    error_message = "Environment must be production, staging, or development"
  }
}

variable "region" {
  type        = string
  description = "AWS region for primary bucket deployment"
  default     = "us-east-1"
}

variable "backup_region" {
  type        = string
  description = "AWS region for backup bucket replication"
  default     = "eu-west-1"
}

variable "media_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for storing family photos and media content"
  default     = "myfamily-media"
}

variable "gazette_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for storing generated gazette PDFs"
  default     = "myfamily-gazettes"
}

variable "backup_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for storing system backups and replicated data"
  default     = "myfamily-backups"
}

variable "cors_allowed_origins" {
  type        = list(string)
  description = "List of allowed origins for CORS configuration on media bucket"
  default     = ["https://*.myfamily.com"]
}

variable "media_lifecycle_rules" {
  type = list(object({
    id      = string
    enabled = bool
    transition = object({
      days         = number
      storage_class = string
    })
  }))
  description = "Lifecycle rules for media bucket content management"
  default = [
    {
      id      = "transition-ia"
      enabled = true
      transition = {
        days         = 90
        storage_class = "STANDARD_IA"
      }
    }
  ]
}

variable "gazette_lifecycle_rules" {
  type = list(object({
    id      = string
    enabled = bool
    transition = object({
      days         = number
      storage_class = string
    })
  }))
  description = "Lifecycle rules for gazette PDF retention"
  default = [
    {
      id      = "archive"
      enabled = true
      transition = {
        days         = 365
        storage_class = "GLACIER"
      }
    }
  ]
}

variable "backup_lifecycle_rules" {
  type = list(object({
    id      = string
    enabled = bool
    transition = object({
      days         = number
      storage_class = string
    })
  }))
  description = "Lifecycle rules for backup retention and archival"
  default = [
    {
      id      = "archive-old-backups"
      enabled = true
      transition = {
        days         = 730
        storage_class = "DEEP_ARCHIVE"
      }
    }
  ]
}

variable "versioning_enabled" {
  type        = bool
  description = "Enable versioning for all S3 buckets"
  default     = true
}

variable "encryption_type" {
  type        = string
  description = "Type of server-side encryption to use"
  default     = "aws:kms"
  validation {
    condition     = can(regex("^(aws:kms|AES256)$", var.encryption_type))
    error_message = "Encryption type must be aws:kms or AES256"
  }
}

variable "replication_enabled" {
  type        = bool
  description = "Enable cross-region replication for backup bucket"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Common tags to be applied to all S3 buckets"
  default = {
    Project    = "MyFamily"
    ManagedBy  = "Terraform"
  }
}