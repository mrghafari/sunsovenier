# Docker Deployment Guide - Momtaz Chem

This guide covers deployment on both **Windows Docker Desktop** and **Ubuntu Server**.

## Quick Start

### 1. Clone and Configure

```bash
git clone https://github.com/mrghafari/MomtazChem.git
cd MomtazChem
cp .env.example .env
# Edit .env with your values
```

### 2. Run Application

**Basic (without Nginx):**
```bash
docker-compose up -d
```

**With Nginx (production):**
```bash
docker-compose --profile with-nginx up -d
```

**Access:** http://localhost:5000

---

## Windows Docker Desktop

### Prerequisites
1. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Enable WSL 2 backend (recommended)
3. Ensure Docker Desktop is running

### Run Commands (PowerShell)
```powershell
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Stop
docker-compose down

# Reset (with data deletion)
docker-compose down -v
```

### Common Issues on Windows
- **Line endings:** If entrypoint fails, run: `git config --global core.autocrlf input`
- **Ports in use:** Change APP_PORT in .env if 5000 is busy
- **WSL memory:** Add `.wslconfig` to limit memory if needed

---

## Ubuntu Server

### Prerequisites
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin
```

### Deployment
```bash
# Clone repository
git clone https://github.com/mrghafari/MomtazChem.git
cd MomtazChem

# Configure environment
cp .env.example .env
nano .env

# Create SSL directory (for production with Nginx)
mkdir -p ssl

# Start services
docker compose up -d --build

# Enable auto-start on boot
sudo systemctl enable docker
```

### Production with SSL
```bash
# Place SSL certificates in ./ssl/
# - ssl/cert.pem
# - ssl/key.pem

# Start with Nginx
docker compose --profile with-nginx up -d
```

---

## Useful Commands

```bash
# View all containers
docker-compose ps

# View app logs
docker-compose logs -f app

# View database logs
docker-compose logs -f db

# Restart app only
docker-compose restart app

# Rebuild without cache
docker-compose build --no-cache

# Access database shell
docker-compose exec db psql -U momtaz -d momtaz_chem

# Backup database
docker-compose exec db pg_dump -U momtaz momtaz_chem > backup.sql

# Restore database
docker-compose exec -T db psql -U momtaz momtaz_chem < backup.sql
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection | postgresql://momtaz:momtaz_password@db:5432/momtaz_chem |
| SESSION_SECRET | Session encryption key | (required) |
| APP_PORT | External app port | 5000 |
| DB_PORT | External database port | 5432 |

See `.env.example` for full list.

---

## Health Check

The application exposes a health endpoint:
```bash
curl http://localhost:5000/api/health
```

Expected response: `{"status":"ok"}`

---

## Troubleshooting

### Container won't start
```bash
docker-compose logs app
```

### Database connection error
```bash
# Check if db is healthy
docker-compose ps
# Wait for db to be ready, then restart app
docker-compose restart app
```

### Permission denied on Linux
```bash
sudo chown -R $USER:$USER .
chmod +x docker-entrypoint.sh
```
