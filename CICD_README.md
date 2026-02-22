# CI/CD Pipeline Documentation - MomtazChem

## Overview*

This project uses GitHub Actions for continuous integration and deployment with Docker.

## Pipeline Stages

```
┌─────────────┐    ┌──────────────┐    ┌────────────────┐    ┌───────────────────┐
│ Lint & Test │ -> │ Build & Push │ -> │ Deploy Staging │ -> │ Deploy Production │
└─────────────┘    └──────────────┘    └────────────────┘    └───────────────────┘
```

## Branches

| Branch | Deployment |
|--------|------------|
| `develop` | Staging |
| `main` | Production |

## Required Secrets

Configure these in GitHub Repository Settings > Secrets:

### Registry
- `GITHUB_TOKEN` - Auto-provided by GitHub

### Staging Environment
- `STAGING_SSH_HOST` - Staging server IP/hostname
- `STAGING_SSH_USER` - SSH username
- `STAGING_SSH_KEY` - SSH private key
- `STAGING_DATABASE_URL` - PostgreSQL connection string

### Production Environment
- `PRODUCTION_SSH_HOST` - Production server IP/hostname
- `PRODUCTION_SSH_USER` - SSH username
- `PRODUCTION_SSH_KEY` - SSH private key
- `PRODUCTION_DATABASE_URL` - PostgreSQL connection string

### Application Secrets
- `SESSION_SECRET`
- `AWS_CREDENTIALS_ENCRYPTION_KEY`
- `AWS_ACCESS_KEY_ID_NEW`
- `AWS_SECRET_ACCESS_KEY_NEW`
- `SMTP_USER`
- `SMTP_PASS`

## Environment Variables

Create these in GitHub Repository Settings > Variables:

- `STAGING_URL` - https://staging.momtazchem.com
- `PRODUCTION_URL` - https://www.momtazchem.com

## Server Setup

### Prerequisites

On each deployment server:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
sudo mkdir -p /opt/momtaz-chem
sudo chown $USER:$USER /opt/momtaz-chem
```

### Initial Deployment

```bash
cd /opt/momtaz-chem

# Create .env file
cp .env.example .env
nano .env  # Edit with actual values

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

## Manual Commands

### Deploy Specific Version

```bash
IMAGE_TAG=ghcr.io/momtaz-chem/momtaz-chem:abc1234 docker-compose up -d
```

### View Logs

```bash
docker-compose logs -f app
```

### Database Backup

```bash
./scripts/backup-db.sh
```

### Rollback

```bash
./scripts/rollback.sh production
```

## Health Check

The application exposes a health endpoint at `/api/health` that returns:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "database": "connected"
}
```

## Troubleshooting

### Pipeline Failed at Lint & Test
- Check TypeScript errors: `npm run check`
- Check build: `npm run build`

### Pipeline Failed at Build & Push
- Verify Docker credentials
- Check Dockerfile syntax

### Deployment Failed
- SSH into server and check logs: `docker-compose logs -f`
- Verify DATABASE_URL is correct
- Check disk space: `df -h`

### Health Check Failed
- Check if app is running: `docker ps`
- Check app logs: `docker-compose logs app`
- Verify port 5000 is exposed
- The End
- ،ث
