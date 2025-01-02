# Network Infrastructure Outputs
output "vpc_id" {
  description = "ID of the MyFamily platform VPC"
  value       = module.vpc.vpc_id
  sensitive   = false
}

output "private_subnet_ids" {
  description = "List of private subnet IDs for secure service deployment"
  value       = module.vpc.private_subnet_ids
  sensitive   = false
}

output "public_subnet_ids" {
  description = "List of public subnet IDs for load balancer deployment"
  value       = module.vpc.public_subnet_ids
  sensitive   = false
}

# Compute Infrastructure Outputs
output "eks_cluster_endpoint" {
  description = "Endpoint URL for EKS cluster API server"
  value       = module.eks.cluster_endpoint
  sensitive   = false
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
  sensitive   = false
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
  sensitive   = false
}

output "eks_cluster_certificate_authority" {
  description = "Certificate authority data for EKS cluster authentication"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

# Database Infrastructure Outputs
output "rds_endpoint" {
  description = "Connection endpoint for the RDS PostgreSQL instance"
  value       = module.rds.rds_endpoint
  sensitive   = false
}

output "rds_port" {
  description = "Port number for RDS PostgreSQL connections"
  value       = module.rds.rds_port
  sensitive   = false
}

output "rds_database_name" {
  description = "Name of the MyFamily platform database"
  value       = module.rds.rds_database_name
  sensitive   = false
}

# Cache Infrastructure Outputs
output "elasticache_endpoint" {
  description = "Connection endpoint for Redis ElastiCache cluster"
  value       = module.elasticache.primary_endpoint
  sensitive   = false
}

output "elasticache_port" {
  description = "Port number for Redis ElastiCache connections"
  value       = module.elasticache.port
  sensitive   = false
}

# Storage Infrastructure Outputs
output "s3_bucket_name" {
  description = "Name of the S3 bucket for media storage"
  value       = module.s3.bucket_name
  sensitive   = false
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for media storage"
  value       = module.s3.bucket_arn
  sensitive   = false
}

# CDN Infrastructure Outputs
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution for content delivery"
  value       = module.cloudfront.distribution_id
  sensitive   = false
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = module.cloudfront.domain_name
  sensitive   = false
}

# Monitoring Infrastructure Outputs
output "monitoring_endpoints" {
  description = "Endpoints for monitoring and observability tools"
  value = {
    prometheus = module.monitoring.prometheus_endpoint
    grafana    = module.monitoring.grafana_endpoint
    kibana     = module.monitoring.kibana_endpoint
    jaeger     = module.monitoring.jaeger_endpoint
  }
  sensitive = false
}

output "log_group_names" {
  description = "Names of CloudWatch Log Groups for centralized logging"
  value = {
    eks        = module.eks.log_group_name
    rds        = module.rds.log_group_name
    vpc_flow   = module.vpc.flow_logs_group_name
    application = "/aws/myfamily/${var.environment}/application"
  }
  sensitive = false
}

# Security Infrastructure Outputs
output "kms_key_arns" {
  description = "ARNs of KMS keys used for encryption"
  value = {
    eks     = module.eks.kms_key_arn
    rds     = module.rds.kms_key_arn
    s3      = module.s3.kms_key_arn
    secrets = module.secrets.kms_key_arn
  }
  sensitive = true
}

# Backup Infrastructure Outputs
output "backup_vault_name" {
  description = "Name of the AWS Backup vault for centralized backups"
  value       = module.backup.vault_name
  sensitive   = false
}

# Region Information
output "primary_region" {
  description = "Primary AWS region for the deployment"
  value       = var.aws_region
  sensitive   = false
}

output "backup_region" {
  description = "Secondary AWS region for disaster recovery"
  value       = var.backup_region
  sensitive   = false
}

# Environment Information
output "environment" {
  description = "Current deployment environment"
  value       = var.environment
  sensitive   = false
}

output "deployment_tags" {
  description = "Common tags applied to all resources"
  value       = var.common_tags
  sensitive   = false
}