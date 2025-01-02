# Redis node type configuration
variable "redis_node_type" {
  type        = string
  description = "Instance type for Redis nodes with minimum t3.medium for production workloads"
  default     = "cache.t3.medium"

  validation {
    condition     = can(regex("^cache\\.[a-z0-9]+\\.[a-z]+$", var.redis_node_type))
    error_message = "Redis node type must be a valid ElastiCache instance type starting with 'cache.'"
  }
}

# Redis port configuration
variable "redis_port" {
  type        = number
  description = "Port number for Redis cluster communication"
  default     = 6379

  validation {
    condition     = var.redis_port > 0 && var.redis_port < 65536
    error_message = "Redis port must be between 1 and 65535"
  }
}

# Number of cache clusters configuration
variable "num_cache_clusters" {
  type        = number
  description = "Number of cache clusters for high availability and read scaling"
  default     = 3

  validation {
    condition     = var.num_cache_clusters >= 2 && var.num_cache_clusters <= 6
    error_message = "Number of cache clusters must be between 2 and 6 for high availability"
  }
}

# Snapshot retention configuration
variable "snapshot_retention_limit" {
  type        = number
  description = "Number of days to retain automatic cache cluster snapshots"
  default     = 7

  validation {
    condition     = var.snapshot_retention_limit >= 1 && var.snapshot_retention_limit <= 35
    error_message = "Snapshot retention limit must be between 1 and 35 days"
  }
}

# Maintenance window configuration
variable "maintenance_window" {
  type        = string
  description = "Weekly time range for system maintenance operations"
  default     = "sun:05:00-sun:07:00"

  validation {
    condition     = can(regex("^[a-z]{3}:[0-9]{2}:[0-9]{2}-[a-z]{3}:[0-9]{2}:[0-9]{2}$", var.maintenance_window))
    error_message = "Maintenance window must be in the format 'ddd:hh:mm-ddd:hh:mm'"
  }
}

# Snapshot window configuration
variable "snapshot_window" {
  type        = string
  description = "Daily time range for automated snapshot creation"
  default     = "03:00-05:00"

  validation {
    condition     = can(regex("^[0-9]{2}:[0-9]{2}-[0-9]{2}:[0-9]{2}$", var.snapshot_window))
    error_message = "Snapshot window must be in the format 'hh:mm-hh:mm'"
  }
}

# Encryption at rest configuration
variable "at_rest_encryption_enabled" {
  type        = bool
  description = "Enable encryption at rest for Redis cluster"
  default     = true

  validation {
    condition     = var.at_rest_encryption_enabled == true
    error_message = "Encryption at rest must be enabled for security compliance"
  }
}

# Encryption in transit configuration
variable "transit_encryption_enabled" {
  type        = bool
  description = "Enable encryption in transit for Redis cluster"
  default     = true

  validation {
    condition     = var.transit_encryption_enabled == true
    error_message = "Encryption in transit must be enabled for security compliance"
  }
}