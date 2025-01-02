# Terraform AWS EKS Variables
# Version: hashicorp/terraform ~> 1.0

variable "cluster_name" {
  description = "Name of the EKS cluster for MyFamily platform"
  type        = string
  default     = "myfamily-eks-cluster"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.cluster_name))
    error_message = "Cluster name must start with a letter and contain only alphanumeric characters and hyphens."
  }
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.24"

  validation {
    condition     = can(regex("^1\\.(2[4-9]|30)$", var.cluster_version))
    error_message = "Cluster version must be 1.24 or higher."
  }
}

variable "enable_private_access" {
  description = "Enable private API server endpoint access"
  type        = bool
  default     = true
}

variable "enable_public_access" {
  description = "Enable public API server endpoint access"
  type        = bool
  default     = false
}

variable "node_group_instance_types" {
  description = "List of EC2 instance types for EKS node groups"
  type        = list(string)
  default     = ["t3.large", "c5.xlarge"]

  validation {
    condition     = can([for t in var.node_group_instance_types : regex("^[tcrm][3-6][.][\\w]+$", t)])
    error_message = "Instance types must be valid AWS instance types."
  }
}

variable "node_group_desired_size" {
  description = "Desired number of nodes in EKS node group"
  type        = number
  default     = 3

  validation {
    condition     = var.node_group_desired_size >= 3
    error_message = "Desired size must be at least 3 for high availability."
  }
}

variable "node_group_min_size" {
  description = "Minimum number of nodes in EKS node group"
  type        = number
  default     = 3

  validation {
    condition     = var.node_group_min_size >= 3
    error_message = "Minimum size must be at least 3 for high availability."
  }
}

variable "node_group_max_size" {
  description = "Maximum number of nodes in EKS node group"
  type        = number
  default     = 10

  validation {
    condition     = var.node_group_max_size >= var.node_group_min_size
    error_message = "Maximum size must be greater than or equal to minimum size."
  }
}

variable "enable_encryption" {
  description = "Enable envelope encryption for EKS secrets using KMS"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "ARN of KMS key for EKS encryption"
  type        = string
  default     = null
}

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch logging for EKS control plane"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 90

  validation {
    condition     = contains([0, 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch logs retention period."
  }
}

variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to all EKS resources"
  type        = map(string)
  default = {
    Environment = "production"
    Project     = "myfamily"
    ManagedBy   = "terraform"
  }
}

# Import VPC variables
variable "vpc_id" {
  description = "ID of the VPC where EKS cluster will be deployed"
  type        = string
}

variable "private_subnets" {
  description = "List of private subnet IDs for EKS node groups"
  type        = list(string)
}

locals {
  # Ensure we have enough subnets for high availability
  subnet_validation = length(var.private_subnets) >= 3

  # Common cluster tags required by EKS
  cluster_tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }

  # Merge common tags with user provided tags
  merged_tags = merge(var.tags, local.cluster_tags)
}