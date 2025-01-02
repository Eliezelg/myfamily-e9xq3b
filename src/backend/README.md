# MyFamily Platform - Backend Services

Enterprise-grade backend microservices architecture for the MyFamily digital-to-print platform.

## Architecture Overview

The backend consists of six microservices:

- **API Gateway** (Port 3000) - Entry point for client requests
- **Auth Service** (Port 3001) - Authentication and authorization
- **Content Service** (Port 3002) - Media processing and storage
- **Gazette Service** (Port 3003) - Publication generation
- **Payment Service** (Port 3004) - Financial transactions
- **Worker Service** (Port 3005) - Background processing

## Prerequisites

- Node.js >= 18.0.0
- NPM >= 8.0.0
- Docker >= 20.10.0
- Docker Compose >= 2.0.0
- PostgreSQL 14
- Redis 6.2
- AWS CLI >= 2.0.0
- Kubernetes CLI >= 1.24

## Core Dependencies

- Express.js v4.18.2 - Web framework
- Sharp v0.31.0 - Image processing
- Prisma v4.9.0 - Database ORM
- Bull v4.10.0 - Job queue
- AWS SDK v3.300.0 - Cloud services

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd src/backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
```

4. Generate Prisma client:
```bash
npm run prisma:generate
```

5. Start development services:
```bash
docker-compose up -d
```

## Development

```bash
# Start all services in development mode
npm run dev

# Run tests
npm run test

# Run linting
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

## Deployment

### Local Docker Deployment
```bash
docker-compose up -d
```

### Kubernetes Deployment
```bash
# Apply Kubernetes configurations
kubectl apply -f k8s/

# Verify deployments
kubectl get pods -n myfamily
```

## Service Configuration

### API Gateway
- Rate limiting: 1000 requests/hour
- CORS enabled for configured origins
- Request validation middleware
- Response compression
- Security headers via Helmet

### Auth Service
- JWT authentication with refresh tokens
- OAuth2 integration (Google)
- 2FA support
- Role-based access control
- Session management via Redis

### Content Service
- Image processing with Sharp.js
- Multi-language support
- AWS S3 storage integration
- CloudFront CDN distribution
- Print-ready output generation

### Gazette Service
- PDF generation with custom templates
- Multi-calendar support
- Quality assurance automation
- Print partner integration
- Distribution management

### Payment Service
- Stripe integration for international payments
- Tranzillia for Israeli market
- Family pool management
- Subscription handling
- Transaction history

### Worker Service
- Background job processing
- Image optimization
- Email notifications
- Content validation
- Cache management

## Security

- TLS 1.3 encryption
- JWT-based authentication
- Role-based access control
- Rate limiting
- Input validation
- SQL injection protection
- XSS prevention
- CSRF protection
- Security headers
- Audit logging

## Monitoring

- Prometheus metrics
- Grafana dashboards
- ELK Stack integration
- Health check endpoints
- Performance monitoring
- Error tracking via Sentry

## Directory Structure

```
src/backend/
├── src/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── content-service/
│   ├── gazette-service/
│   ├── payment-service/
│   ├── worker-service/
│   └── shared/
├── docker/
├── k8s/
├── prisma/
├── tests/
└── scripts/
```

## Environment Variables

Required environment variables for each service are documented in `.env.example`.

## API Documentation

API documentation is available at `/api/docs` when running in development mode.

## Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

## Logging

- Winston logger with daily rotation
- Log levels: error, warn, info, debug
- Structured JSON logging
- Centralized log aggregation

## Error Handling

- Standardized error responses
- Error tracking via Sentry
- Circuit breaker implementation
- Graceful degradation
- Retry mechanisms

## Contributing

1. Follow TypeScript best practices
2. Ensure tests pass
3. Update documentation
4. Submit pull request

## License

Private - MyFamily Platform - All rights reserved