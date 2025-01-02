# Terraform AWS VPC Variables
# Version: hashicorp/terraform ~> 1.0

variable "vpc_cidr" {
  type        = string
  description = "Primary CIDR block for the VPC with sufficient IP space for all environments"
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0)) && split("/", var.vpc_cidr)[1] <= 16
    error_message = "VPC CIDR must be a valid IPv4 CIDR block with mask /16 or larger"
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment identifier for resource tagging and isolation"

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development"
  }
}

variable "availability_zones" {
  type        = list(string)
  description = "List of AWS availability zones for multi-AZ deployment and high availability"

  validation {
    condition     = length(var.availability_zones) >= 3
    error_message = "At least 3 availability zones required for high availability in production"
  }
}

variable "public_subnet_count" {
  type        = number
  description = "Number of public subnets for load balancers and bastion hosts"
  default     = 3

  validation {
    condition     = var.public_subnet_count >= 2
    error_message = "At least 2 public subnets required for high availability"
  }
}

variable "private_subnet_count" {
  type        = number
  description = "Number of private subnets for application and database tiers"
  default     = 3

  validation {
    condition     = var.private_subnet_count >= 3
    error_message = "At least 3 private subnets required for production workloads"
  }
}

variable "enable_dns_hostnames" {
  type        = bool
  description = "Enable DNS hostnames for EC2 instance DNS resolution"
  default     = true
}

variable "enable_dns_support" {
  type        = bool
  description = "Enable DNS resolution support within the VPC"
  default     = true
}

variable "enable_nat_gateway" {
  type        = bool
  description = "Enable NAT Gateway for private subnet internet access"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Common tags to be applied to all VPC resources"
  default     = {}
}

locals {
  # Default tags that will be merged with user provided tags
  default_tags = {
    ManagedBy   = "terraform"
    Environment = var.environment
    Project     = "myfamily"
  }

  # Merge default tags with user provided tags
  merged_tags = merge(local.default_tags, var.tags)

  # Validate availability zones match subnet counts
  az_validation = length(var.availability_zones) >= max(var.public_subnet_count, var.private_subnet_count)
}