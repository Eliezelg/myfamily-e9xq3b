# Terraform configuration block with version constraints and required providers
terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  # S3 backend configuration for state management with enhanced security
  backend "s3" {
    bucket         = "myfamily-terraform-state-${var.environment}"
    key            = "infrastructure/${var.environment}/terraform.tfstate"
    region         = var.aws_region
    encrypt        = true
    kms_key_id     = var.state_encryption_key_arn
    dynamodb_table = "terraform-state-lock-${var.environment}"
    versioning     = true
    
    access_logging {
      target_bucket = "myfamily-terraform-logs-${var.environment}"
      target_prefix = "state-access-logs/"
    }
  }
}

# Primary AWS provider configuration
provider "aws" {
  region = var.aws_region
  
  # Security controls for account access
  allowed_account_ids = [var.aws_account_id]
  
  # IAM role assumption for Terraform operations
  assume_role {
    role_arn     = var.aws_role_arn
    session_name = "MyFamilyTerraform"
  }

  # Default tags for all resources
  default_tags {
    Project            = "MyFamily"
    Environment        = var.environment
    ManagedBy         = "Terraform"
    SecurityLevel     = "High"
    DataClassification = "Confidential"
  }
}

# Secondary AWS provider for backup region
provider "aws" {
  alias  = "backup"
  region = var.aws_backup_region
  
  # Security controls for backup account access
  allowed_account_ids = [var.aws_account_id]
  
  # IAM role assumption for backup region operations
  assume_role {
    role_arn     = var.aws_backup_role_arn
    session_name = "MyFamilyTerraformBackup"
  }

  # Default tags for backup region resources
  default_tags {
    Project            = "MyFamily"
    Environment        = var.environment
    ManagedBy         = "Terraform"
    SecurityLevel     = "High"
    DataClassification = "Confidential"
    Purpose           = "Backup"
  }
}