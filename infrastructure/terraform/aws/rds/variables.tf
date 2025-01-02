# Import environment variable from parent module
variable "environment" {
  type        = string
  description = "Deployment environment (production, staging, development)"
}

# Database name configuration
variable "db_name" {
  type        = string
  description = "Name of the PostgreSQL database"
  default     = "myfamily"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]*$", var.db_name))
    error_message = "Database name must start with a letter and contain only alphanumeric characters and underscores"
  }
}

# Instance class configuration
variable "db_instance_class" {
  type        = string
  description = "RDS instance class for the database"
  default     = "db.t3.large"

  validation {
    condition     = contains(["db.t3.large", "db.t3.xlarge", "db.r5.large", "db.r5.xlarge"], var.db_instance_class)
    error_message = "Instance class must be one of the allowed values for production use"
  }
}

# PostgreSQL engine version
variable "engine_version" {
  type        = string
  description = "PostgreSQL engine version"
  default     = "14.7"

  validation {
    condition     = can(regex("^14\\.[0-9]+$", var.engine_version))
    error_message = "Must use PostgreSQL version 14.x as specified in requirements"
  }
}

# High availability configuration
variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for high availability"
  default     = true
}

# Storage encryption configuration
variable "storage_encrypted" {
  type        = bool
  description = "Enable storage encryption using AWS KMS"
  default     = true
}

# Backup retention configuration
variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups"
  default     = 7

  validation {
    condition     = var.backup_retention_period >= 7
    error_message = "Backup retention period must be at least 7 days for compliance"
  }
}

# Deletion protection configuration
variable "deletion_protection" {
  type        = bool
  description = "Enable deletion protection for the RDS instance"
  default     = true
}

# Enhanced monitoring configuration
variable "monitoring_interval" {
  type        = number
  description = "Enhanced monitoring interval in seconds"
  default     = 60

  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be one of: 0, 1, 5, 10, 15, 30, 60"
  }
}

# Performance insights configuration
variable "performance_insights_enabled" {
  type        = bool
  description = "Enable Performance Insights for database monitoring"
  default     = true
}

variable "performance_insights_retention_period" {
  type        = number
  description = "Performance Insights retention period in days"
  default     = 7

  validation {
    condition     = contains([7, 31, 62, 93, 186, 372, 731], var.performance_insights_retention_period)
    error_message = "Retention period must be one of: 7, 31, 62, 93, 186, 372, 731"
  }
}

# Storage configuration
variable "allocated_storage" {
  type        = number
  description = "Allocated storage size in GB"
  default     = 100

  validation {
    condition     = var.allocated_storage >= 100
    error_message = "Allocated storage must be at least 100 GB for production use"
  }
}

variable "max_allocated_storage" {
  type        = number
  description = "Maximum storage size in GB for autoscaling"
  default     = 1000

  validation {
    condition     = var.max_allocated_storage >= var.allocated_storage
    error_message = "Maximum allocated storage must be greater than or equal to allocated storage"
  }
}

# Maintenance window configuration
variable "maintenance_window" {
  type        = string
  description = "Preferred maintenance window"
  default     = "sun:03:00-sun:04:00"

  validation {
    condition     = can(regex("^[a-z]{3}:[0-9]{2}:[0-9]{2}-[a-z]{3}:[0-9]{2}:[0-9]{2}$", var.maintenance_window))
    error_message = "Maintenance window must be in format: ddd:hh24:mi-ddd:hh24:mi"
  }
}

# Backup window configuration
variable "backup_window" {
  type        = string
  description = "Preferred backup window"
  default     = "02:00-03:00"

  validation {
    condition     = can(regex("^[0-9]{2}:[0-9]{2}-[0-9]{2}:[0-9]{2}$", var.backup_window))
    error_message = "Backup window must be in format: hh24:mi-hh24:mi"
  }
}