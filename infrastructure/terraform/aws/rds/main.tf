# Terraform configuration for AWS RDS PostgreSQL cluster
# Provider: hashicorp/aws ~> 4.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Import VPC data from remote state
data "terraform_remote_state" "vpc" {
  backend = "s3"
  config = {
    bucket = "myfamily-terraform-state"
    key    = "vpc/terraform.tfstate"
    region = "us-east-1"
  }
}

# RDS Parameter Group for PostgreSQL optimization
resource "aws_db_parameter_group" "main" {
  name   = "myfamily-postgres14-${var.environment}"
  family = "postgres14"

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4096}MB"
  }

  parameter {
    name  = "max_connections"
    value = "1000"
  }

  parameter {
    name  = "work_mem"
    value = "64MB"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "256MB"
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4096}MB"
  }

  parameter {
    name  = "ssl"
    value = "1"
  }

  tags = {
    Name        = "myfamily-postgres-params-${var.environment}"
    Environment = var.environment
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "myfamily-${var.environment}"
  subnet_ids = data.terraform_remote_state.vpc.outputs.private_subnet_ids

  tags = {
    Name        = "myfamily-db-subnet-group-${var.environment}"
    Environment = var.environment
  }
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "myfamily-rds-${var.environment}"
  description = "Security group for RDS PostgreSQL instance"
  vpc_id      = data.terraform_remote_state.vpc.outputs.vpc_id

  ingress {
    description = "PostgreSQL access from application subnets"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "myfamily-rds-sg-${var.environment}"
    Environment = var.environment
  }
}

# IAM Role for Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "myfamily-rds-monitoring-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "myfamily-rds-monitoring-role-${var.environment}"
    Environment = var.environment
  }
}

# Attach the enhanced monitoring policy to the IAM role
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier     = "myfamily-${var.environment}"
  engine         = "postgres"
  engine_version = var.engine_version

  instance_class        = var.db_instance_class
  allocated_storage    = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type         = "gp3"
  iops                 = 3000

  db_name  = var.db_name
  username = "admin"
  password = aws_secretsmanager_secret_version.rds_password.secret_string

  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.main.name

  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window

  storage_encrypted = var.storage_encrypted
  kms_key_id       = aws_kms_key.rds.arn

  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_retention_period
  performance_insights_kms_key_id      = aws_kms_key.rds.arn

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  auto_minor_version_upgrade     = true
  copy_tags_to_snapshot         = true

  deletion_protection = var.deletion_protection
  skip_final_snapshot = false
  final_snapshot_identifier = "myfamily-${var.environment}-final"

  tags = {
    Name        = "myfamily-db-${var.environment}"
    Environment = var.environment
    Backup      = "required"
    Monitoring  = "enhanced"
  }
}

# KMS Key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption - ${var.environment}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name        = "myfamily-rds-kms-${var.environment}"
    Environment = var.environment
  }
}

# KMS Key Alias
resource "aws_kms_alias" "rds" {
  name          = "alias/myfamily-rds-${var.environment}"
  target_key_id = aws_kms_key.rds.key_id
}

# RDS Password in Secrets Manager
resource "aws_secretsmanager_secret" "rds_password" {
  name = "myfamily/rds/${var.environment}/master-password"
  kms_key_id = aws_kms_key.rds.arn

  tags = {
    Name        = "myfamily-rds-password-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  secret_id     = aws_secretsmanager_secret.rds_password.id
  secret_string = random_password.rds_password.result
}

resource "random_password" "rds_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "rds_monitoring_role_arn" {
  description = "ARN of RDS monitoring IAM role"
  value       = aws_iam_role.rds_monitoring.arn
}