# Docker Deployment Guide - Momtaz Chem Platform

## Quick Start-

### 1. Clone and Setup Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your actual values
nano .env
```

### 2. Build and Run (Production)

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Development Mode

```bash
# Start with hot-reload enabled
docker-compose -f docker-compose.dev.yml up -d --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| app | 5000 | Main Node.js application |
| db | 5432 | PostgreSQL database |
| nginx | 80/443 | Reverse proxy (production) |

## Database Management

```bash
# Access PostgreSQL CLI
docker-compose exec db psql -U momtaz -d momtaz_chem

# Run migrations
docker-compose exec app npm run db:push

# Backup database
docker-compose exec db pg_dump -U momtaz momtaz_chem > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T db psql -U momtaz momtaz_chem
```

## SSL/HTTPS Setup

1. Place your SSL certificates in `./ssl/` directory:
   - `ssl/cert.pem` - SSL certificate
   - `ssl/key.pem` - Private key

2. Update `nginx.conf` to enable HTTPS:

```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of config
}
```

## Environment Variables

See `.env.example` for all required environment variables.

### Required Variables

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `AWS_CREDENTIALS_ENCRYPTION_KEY` - For encrypted credentials
- `SMTP_USER` / `SMTP_PASS` - Email configuration

## Troubleshooting

### Database Connection Issues

```bash
# Check if database is running
docker-compose ps

# Check database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Application Errors

```bash
# View application logs
docker-compose logs -f app

# Restart application
docker-compose restart app

# Rebuild and restart
docker-compose up -d --build app
```

## Scaling

```bash
# Scale application instances (with load balancer)
docker-compose up -d --scale app=3
```

## Volumes

- `postgres_data` - Database persistent storage

## Networks

- `momtaz-network` - Internal bridge network for service communication
