# MyFamily Platform

[![Build Status](https://github.com/myfamily/platform/workflows/CI/badge.svg)](https://github.com/myfamily/platform/actions)
[![Test Coverage](https://codecov.io/gh/myfamily/platform/branch/main/graph/badge.svg)](https://codecov.io/gh/myfamily/platform)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/github/v/release/myfamily/platform)](https://github.com/myfamily/platform/releases)
[![Security Scan](https://github.com/myfamily/platform/workflows/security/badge.svg)](https://github.com/myfamily/platform/security)

## Overview

MyFamily is an innovative digital-to-print platform that bridges the generational technology gap by enabling families to share digital content through personalized printed gazettes. The platform connects tech-savvy family members (ages 25-50) with their less digitally-oriented elderly relatives (65+), fostering meaningful connections and creating lasting physical mementos of family moments.

### Key Features

- Digital content sharing and curation
- Automated gazette generation and layout
- Multi-language support across 8 languages
- Family pool payment system
- International printing and distribution
- Professional print quality (300 DPI, CMYK)
- Multi-calendar integration (Gregorian, Hebrew, Islamic, Chinese)

### Target Audience

- **Content Contributors:** Family members aged 25-50
- **Recipients:** Elderly relatives aged 65+
- **Family Administrators:** Account and content managers
- **System Administrators:** Platform operations team

## Architecture

MyFamily platform implements a modern microservices architecture built on:

### Frontend
- Web Application: React.js 18.2+
- Mobile Apps: React Native 0.71+
- UI Components: Material UI 5.11+
- State Management: Redux Toolkit 1.9+

### Backend
- Runtime: Node.js 18 LTS
- API Framework: Express.js 4.18+
- Database: PostgreSQL 14+
- Caching: Redis 6.2+
- Image Processing: Sharp 0.31+
- ORM: Prisma 4.9+

### Infrastructure
- Cloud Provider: AWS
- Container Orchestration: EKS (Kubernetes)
- CDN: CloudFront
- Storage: S3
- Email: SES
- Monitoring: ELK Stack, Prometheus, Grafana

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Docker and Docker Compose
- AWS CLI configured
- Kubernetes cluster access
- Terraform >= 1.0.0

### Quick Start

1. Clone the repository:
```bash
git clone https://github.com/myfamily/platform.git
cd myfamily-platform
```

2. Install dependencies:
```bash
npm install
```

3. Start development environment:
```bash
npm run dev
```

4. Launch with Docker:
```bash
docker-compose up
```

5. Deploy to Kubernetes:
```bash
kubectl apply -f k8s/
```

### Repository Structure

```
myfamily-platform/
├── src/
│   ├── backend/        # Node.js microservices
│   ├── web/           # React.js frontend
│   └── mobile/        # React Native apps
├── infrastructure/
│   ├── terraform/     # IaC configurations
│   ├── kubernetes/    # K8s manifests
│   └── docker/        # Docker configs
└── docs/              # Documentation
```

## Development

### Coding Standards

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Jest for unit testing
- Cypress for E2E testing

### Git Workflow

1. Create feature branch from `develop`
2. Implement changes with tests
3. Submit PR with description
4. Pass CI checks and code review
5. Merge to `develop`

### Testing Requirements

- Unit test coverage > 80%
- E2E test coverage for critical flows
- Performance testing with k6
- Security scanning with Snyk

## Deployment

### Environment Setup

1. Configure AWS credentials
2. Initialize Terraform workspace
3. Deploy infrastructure
4. Configure monitoring
5. Set up CI/CD pipeline

### Production Deployment

```bash
# Infrastructure provisioning
terraform init
terraform apply

# Application deployment
kubectl apply -f k8s/production/

# Verify deployment
kubectl get pods -n production
```

## Security

- JWT authentication with OAuth 2.0
- Role-based access control (RBAC)
- Data encryption at rest and in transit
- Regular security audits
- GDPR and CCPA compliance
- PCI DSS compliance for payments

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

For detailed documentation:
- [Backend Setup](src/backend/README.md)
- [Frontend Development](src/web/README.md)
- [Infrastructure Management](infrastructure/README.md)

For support: support@myfamily-platform.com