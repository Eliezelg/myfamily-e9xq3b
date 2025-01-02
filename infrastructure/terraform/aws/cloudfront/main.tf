# AWS CloudFront configuration for MyFamily platform
# Version: ~> 4.0

# Origin Access Identity for media bucket
resource "aws_cloudfront_origin_access_identity" "media_oai" {
  comment = "OAI for ${var.environment} media content access"
}

# Origin Access Identity for gazette bucket
resource "aws_cloudfront_origin_access_identity" "gazette_oai" {
  comment = "OAI for ${var.environment} gazette PDF access"
}

# ACM Certificate for CDN domain
resource "aws_acm_certificate" "cdn" {
  provider          = aws.us-east-1  # ACM certificate must be in us-east-1 for CloudFront
  domain_name       = "${var.environment}-cdn.myfamily.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-cdn-cert"
  })
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled    = true
  comment            = "MyFamily ${var.environment} content delivery"
  price_class        = var.price_class
  aliases            = ["${var.environment}-cdn.myfamily.com"]
  web_acl_id         = aws_wafv2_web_acl.main.arn
  retain_on_delete   = false
  wait_for_deployment = false

  # Media content origin
  origin {
    domain_name = aws_s3_bucket.media.bucket_domain_name
    origin_id   = "media_origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.media_oai.cloudfront_access_identity_path
    }
  }

  # Gazette PDF origin
  origin {
    domain_name = aws_s3_bucket.gazette.bucket_domain_name
    origin_id   = "gazette_origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.gazette_oai.cloudfront_access_identity_path
    }
  }

  # Default cache behavior for media content
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "media_origin"
    compress        = true

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = var.media_cache_ttl.min_ttl
    default_ttl            = var.media_cache_ttl.default_ttl
    max_ttl                = var.media_cache_ttl.max_ttl

    # Security headers
    response_headers_policy {
      security_headers_config {
        content_security_policy {
          content_security_policy = "default-src 'none'; img-src 'self'"
          override = true
        }
        strict_transport_security {
          access_control_max_age_sec = 31536000
          include_subdomains = true
          preload = true
          override = true
        }
        content_type_options {
          override = true
        }
        frame_options {
          frame_option = "DENY"
          override = true
        }
        referrer_policy {
          referrer_policy = "same-origin"
          override = true
        }
      }
    }
  }

  # Ordered cache behavior for gazette PDFs
  ordered_cache_behavior {
    path_pattern     = "/gazettes/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "gazette_origin"
    compress        = true

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = var.gazette_cache_ttl.min_ttl
    default_ttl            = var.gazette_cache_ttl.default_ttl
    max_ttl                = var.gazette_cache_ttl.max_ttl
  }

  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations        = var.allowed_locations
    }
  }

  # SSL/TLS configuration
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cdn.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = var.ssl_protocol_version
  }

  # Custom error responses
  custom_error_response {
    error_code         = 403
    response_code      = 404
    response_page_path = "/errors/404.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/errors/404.html"
    error_caching_min_ttl = 10
  }

  # Logging configuration
  logging_config {
    include_cookies = false
    bucket          = "${aws_s3_bucket.logs.bucket_domain_name}"
    prefix          = "cdn-logs/${var.environment}/"
  }

  tags = merge(var.tags, {
    Name        = "${var.environment}-cdn"
    Environment = var.environment
  })
}

# CloudFront origin request policy
resource "aws_cloudfront_origin_request_policy" "default" {
  name    = "${var.environment}-default-origin-request-policy"
  comment = "Default origin request policy for ${var.environment}"
  
  cookies_config {
    cookie_behavior = "none"
  }
  
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]
    }
  }
  
  query_strings_config {
    query_string_behavior = "none"
  }
}

# CloudFront cache policy
resource "aws_cloudfront_cache_policy" "default" {
  name        = "${var.environment}-default-cache-policy"
  comment     = "Default cache policy for ${var.environment}"
  min_ttl     = var.media_cache_ttl.min_ttl
  default_ttl = var.media_cache_ttl.default_ttl
  max_ttl     = var.media_cache_ttl.max_ttl
  
  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}