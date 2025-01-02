# AWS S3 Terraform Configuration for MyFamily Platform
# Version: 4.0
# Purpose: Manages S3 buckets for media storage, gazette PDFs, and backups

terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# KMS key for S3 bucket encryption
resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 bucket encryption"
  deletion_window_in_days = 30
  enable_key_rotation    = true

  tags = merge(var.tags, {
    Name = "${var.environment}-s3-encryption-key"
  })
}

# Media bucket for storing family photos and content
resource "aws_s3_bucket" "media" {
  bucket = "${var.environment}-${var.media_bucket_name}"
  
  tags = merge(var.tags, {
    Name = "${var.environment}-media-bucket"
  })
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Disabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3.arn
      sse_algorithm     = var.encryption_type
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  dynamic "rule" {
    for_each = var.media_lifecycle_rules
    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      transition {
        days          = rule.value.transition.days
        storage_class = rule.value.transition.storage_class
      }
    }
  }
}

# Gazette bucket for storing PDF files
resource "aws_s3_bucket" "gazette" {
  bucket = "${var.environment}-${var.gazette_bucket_name}"
  
  tags = merge(var.tags, {
    Name = "${var.environment}-gazette-bucket"
  })
}

resource "aws_s3_bucket_versioning" "gazette" {
  bucket = aws_s3_bucket.gazette.id
  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Disabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "gazette" {
  bucket = aws_s3_bucket.gazette.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3.arn
      sse_algorithm     = var.encryption_type
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "gazette" {
  bucket = aws_s3_bucket.gazette.id

  dynamic "rule" {
    for_each = var.gazette_lifecycle_rules
    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      transition {
        days          = rule.value.transition.days
        storage_class = rule.value.transition.storage_class
      }
    }
  }
}

# Backup bucket for system backups and replication
resource "aws_s3_bucket" "backup" {
  bucket = "${var.environment}-${var.backup_bucket_name}"
  
  tags = merge(var.tags, {
    Name = "${var.environment}-backup-bucket"
  })
}

resource "aws_s3_bucket_versioning" "backup" {
  bucket = aws_s3_bucket.backup.id
  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Disabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3.arn
      sse_algorithm     = var.encryption_type
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  dynamic "rule" {
    for_each = var.backup_lifecycle_rules
    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      transition {
        days          = rule.value.transition.days
        storage_class = rule.value.transition.storage_class
      }
    }
  }
}

# Common bucket policies and settings
resource "aws_s3_bucket_public_access_block" "all" {
  for_each = toset([
    aws_s3_bucket.media.id,
    aws_s3_bucket.gazette.id,
    aws_s3_bucket.backup.id
  ])

  bucket = each.value

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Logging bucket for S3 access logs
resource "aws_s3_bucket" "logs" {
  bucket = "${var.environment}-${var.media_bucket_name}-logs"
  
  tags = merge(var.tags, {
    Name = "${var.environment}-s3-logs"
  })
}

resource "aws_s3_bucket_logging" "all" {
  for_each = toset([
    aws_s3_bucket.media.id,
    aws_s3_bucket.gazette.id,
    aws_s3_bucket.backup.id
  ])

  bucket = each.value

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "${each.value}-logs/"
}

# Outputs for use in other modules
output "media_bucket" {
  value = {
    id                           = aws_s3_bucket.media.id
    arn                         = aws_s3_bucket.media.arn
    bucket_domain_name          = aws_s3_bucket.media.bucket_domain_name
    bucket_regional_domain_name = aws_s3_bucket.media.bucket_regional_domain_name
  }
  description = "Media bucket details"
}

output "gazette_bucket" {
  value = {
    id                  = aws_s3_bucket.gazette.id
    arn                = aws_s3_bucket.gazette.arn
    bucket_domain_name = aws_s3_bucket.gazette.bucket_domain_name
  }
  description = "Gazette bucket details"
}

output "backup_bucket" {
  value = {
    id                  = aws_s3_bucket.backup.id
    arn                = aws_s3_bucket.backup.arn
    bucket_domain_name = aws_s3_bucket.backup.bucket_domain_name
  }
  description = "Backup bucket details"
}