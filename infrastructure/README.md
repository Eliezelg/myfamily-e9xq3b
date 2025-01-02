# MyFamily Platform Infrastructure Documentation

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [AWS Infrastructure](#aws-infrastructure)
4. [Kubernetes Cluster](#kubernetes-cluster)
5. [Monitoring Stack](#monitoring-stack)
6. [Deployment Procedures](#deployment-procedures)
7. [Backup and Recovery](#backup-and-recovery)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)

## Overview

The MyFamily platform infrastructure is built on AWS cloud services utilizing a containerized microservices architecture. This documentation provides comprehensive setup, deployment, and operational procedures for DevOps engineers.

Key Components:
- AWS Cloud Infrastructure (EKS, RDS, ElastiCache, S3, CloudFront)
- Kubernetes Container Orchestration
- ELK Stack, Prometheus, Grafana Monitoring
- Automated CI/CD Pipeline
- Disaster Recovery Systems

## Prerequisites

### Required Tools
- AWS CLI v2.x
- Terraform v1.5+
- kubectl v1.24+
- Helm v3.x
- Docker v20.10+

### Required Credentials
- AWS access keys with appropriate IAM permissions
- kubectl configuration for cluster access
- Docker registry credentials

### Required Permissions
- AWS IAM roles for service accounts
- Kubernetes RBAC configurations
- CI/CD pipeline access

## AWS Infrastructure

### VPC Setup
1. Network Architecture
   - Production VPC: 10.0.0.0/16
   - Public subnets: 10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24
   - Private subnets: 10.0.4.0/24, 10.0.5.0/24, 10.0.6.0/24
   - NAT Gateways in each AZ
   - VPC Endpoints for AWS services

2. Security Groups
   - EKS cluster security group
   - RDS security group
   - ElastiCache security group
   - Bastion host security group

### EKS Cluster
1. Cluster Configuration
   - Kubernetes version: 1.24
   - Control plane logging enabled
   - Private API endpoint
   - Add-ons: VPC CNI, CoreDNS, kube-proxy

2. Node Groups
   - System nodes: t3.large (2 vCPU, 8GB RAM)
   - Application nodes: c5.xlarge (4 vCPU, 16GB RAM)
   - Autoscaling enabled (min: 3, max: 10)

### RDS Setup
1. PostgreSQL Configuration
   - Engine: PostgreSQL 14
   - Instance class: db.r5.2xlarge
   - Multi-AZ deployment
   - Automated backups with 35-day retention
   - Performance Insights enabled

### ElastiCache
1. Redis Cluster Setup
   - Engine: Redis 6.x
   - Node type: cache.r5.large
   - Multi-AZ with automatic failover
   - Encryption at rest and in transit

### S3 Storage
1. Bucket Configuration
   - Media bucket with versioning
   - Backup bucket with lifecycle policies
   - Server-side encryption (AES-256)
   - Cross-region replication for DR

### CloudFront
1. CDN Setup
   - Custom domain with SSL/TLS
   - Edge locations optimization
   - Cache behavior rules
   - Origin access identity

## Kubernetes Cluster

### Cluster Setup
1. Initial Configuration
   ```bash
   eksctl create cluster -f cluster-config.yaml
   ```

2. RBAC Setup
   ```bash
   kubectl apply -f rbac/
   ```

### Node Groups
1. Worker Configuration
   ```yaml
   apiVersion: eks.amazonaws.com/v1alpha1
   kind: NodeGroup
   metadata:
     name: app-nodes
   spec:
     instanceType: c5.xlarge
     desiredCapacity: 3
     minSize: 3
     maxSize: 10
   ```

### Storage Classes
1. EBS Configuration
   ```yaml
   apiVersion: storage.k8s.io/v1
   kind: StorageClass
   metadata:
     name: gp3-encrypted
   provisioner: ebs.csi.aws.com
   parameters:
     type: gp3
     encrypted: "true"
   ```

## Monitoring Stack

### ELK Stack
1. Elasticsearch Configuration
   - 3-node cluster (1 master, 2 data nodes)
   - Hot-warm architecture
   - Index lifecycle management
   - Snapshot repository in S3

2. Kibana Setup
   - SSL/TLS enabled
   - RBAC integration
   - Custom dashboards deployment

3. Logstash Configuration
   - Input plugins: Filebeat, TCP/UDP
   - Output configuration to Elasticsearch
   - Log parsing and enrichment

### Prometheus
1. Installation
   ```bash
   helm install prometheus prometheus-community/kube-prometheus-stack
   ```

2. Alert Rules
   ```yaml
   groups:
   - name: node-alerts
     rules:
     - alert: HighCPUUsage
       expr: node_cpu_usage > 80
       for: 5m
   ```

### Grafana
1. Dashboard Provisioning
   ```yaml
   apiVersion: 1
   providers:
   - name: default
     folder: MyFamily
     type: file
     options:
       path: /var/lib/grafana/dashboards
   ```

### Jaeger
1. Operator Setup
   ```bash
   kubectl create -f jaeger-operator.yaml
   ```

## Deployment Procedures

### CI/CD Pipeline
1. GitHub Actions Workflow
   ```yaml
   name: Deploy to Production
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         # Additional deployment steps
   ```

### Blue-Green Deployment
1. Service Configuration
   ```yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: app-blue
   spec:
     selector:
       app: myapp
       version: blue
   ```

## Backup and Recovery

### Backup Procedures
1. Database Backups
   - Automated daily snapshots
   - Transaction log archiving
   - Cross-region replication

2. Storage Backups
   - S3 versioning enabled
   - Lifecycle policies for cost optimization
   - Cross-region replication for DR

### Recovery Procedures
1. Database Recovery
   ```bash
   aws rds restore-db-instance-from-snapshot \
     --db-instance-identifier myapp-db \
     --db-snapshot-identifier snapshot-id
   ```

2. Application Recovery
   ```bash
   kubectl rollout undo deployment/myapp
   ```

## Maintenance

### Routine Tasks
1. Daily Checks
   - Cluster health verification
   - Resource utilization review
   - Log analysis
   - Backup validation

2. Weekly Tasks
   - Security patch assessment
   - Performance optimization
   - Capacity planning
   - Cost analysis

### Version Updates
1. Kubernetes Updates
   ```bash
   eksctl upgrade cluster --name=myfamily-prod
   ```

## Troubleshooting

### Common Issues
1. Pod Failures
   ```bash
   kubectl describe pod <pod-name>
   kubectl logs <pod-name> --previous
   ```

2. Network Issues
   ```bash
   kubectl exec -it <pod-name> -- nc -vz <service-name> <port>
   ```

3. Performance Issues
   ```bash
   kubectl top pods
   kubectl top nodes
   ```

### Escalation Paths
1. Level 1: DevOps Engineer
2. Level 2: Platform Engineering
3. Level 3: AWS Support
4. Level 4: Senior Architecture Team

For detailed procedures and configurations, refer to the respective subdirectories:
- `/terraform` - Infrastructure as Code
- `/kubernetes` - Kubernetes manifests
- `/monitoring` - Monitoring configurations
- `/scripts` - Management scripts