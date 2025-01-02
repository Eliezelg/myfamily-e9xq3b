# AWS ElastiCache Redis Configuration for MyFamily Platform
# Provider: hashicorp/aws ~> 4.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Local variables for resource naming and tagging
locals {
  common_tags = {
    Project     = "MyFamily"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Service     = "Redis"
  }

  name_prefix = "${var.environment}-myfamily"
}

# Redis subnet group for cluster deployment
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name_prefix}-redis-subnet"
  subnet_ids = data.terraform_remote_state.vpc.outputs.private_subnet_ids

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-subnet"
  })
}

# Redis parameter group for cluster configuration
resource "aws_elasticache_parameter_group" "redis" {
  family = "redis6.x"
  name   = "${local.name_prefix}-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "AKE"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-params"
  })
}

# Redis replication group for high availability
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "${local.name_prefix}-redis"
  replication_group_description = "Redis cluster for MyFamily platform"
  node_type                    = var.redis_node_type
  port                         = var.redis_port
  parameter_group_name         = aws_elasticache_parameter_group.redis.name
  subnet_group_name            = aws_elasticache_subnet_group.redis.name
  security_group_ids           = [aws_security_group.redis.id]

  # High availability configuration
  automatic_failover_enabled = true
  multi_az_enabled          = true
  num_cache_clusters        = 2

  # Engine configuration
  engine         = "redis"
  engine_version = "6.2"

  # Maintenance and backup configuration
  maintenance_window      = "sun:05:00-sun:07:00"
  snapshot_window        = "03:00-05:00"
  snapshot_retention_limit = 7
  auto_minor_version_upgrade = true
  apply_immediately      = false

  # Security configuration
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  auth_token                 = random_password.auth_token.result

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis"
  })
}

# Generate secure auth token for Redis
resource "random_password" "auth_token" {
  length  = 32
  special = false
}

# Security group for Redis cluster
resource "aws_security_group" "redis" {
  name        = "${local.name_prefix}-redis-sg"
  description = "Security group for Redis cluster"
  vpc_id      = data.terraform_remote_state.vpc.outputs.vpc_id

  ingress {
    description = "Redis from private subnets"
    from_port   = var.redis_port
    to_port     = var.redis_port
    protocol    = "tcp"
    cidr_blocks = data.terraform_remote_state.vpc.outputs.private_subnet_cidrs
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-sg"
  })
}

# CloudWatch alarms for Redis monitoring
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${local.name_prefix}-redis-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "75"
  alarm_actions      = [var.sns_topic_arn]
  ok_actions         = [var.sns_topic_arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = local.common_tags
}

# Outputs for other modules
output "redis_endpoint" {
  description = "Redis primary endpoint address"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "Redis port number"
  value       = var.redis_port
}

output "redis_auth_token" {
  description = "Redis authentication token"
  value       = random_password.auth_token.result
  sensitive   = true
}