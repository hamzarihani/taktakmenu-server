# Docker Setup Guide

This project provides two Docker Compose configurations for different deployment scenarios.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Configuration Files

### 1. `docker-compose.yml` - Remote Database
Use this when you want to run the application container and connect to an **external/remote MySQL database**.

### 2. `docker-compose.local.yml` - Local Database
Use this when you want to run both the application and MySQL database in containers.

## Quick Start

### Option 1: Remote Database

1. **Create `.env` file** with your remote database credentials:
```env
# Database (Remote)
DB_HOST=your-remote-db-host.com
DB_PORT=3306
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=your_db_name

# Application
PORT=5001
NODE_ENV=production

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# SMTP (Email)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password

# Frontend
FRONTEND_URL=https://your-frontend.com
```

2. **Build and run**:
```bash
docker-compose up -d --build
```

3. **View logs**:
```bash
docker-compose logs -f app
```

4. **Stop**:
```bash
docker-compose down
```

### Option 2: Local Database

1. **Create `.env` file** with local database configuration:
```env
# Database (Local - will be created in container)
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=taktakmenu_db
MYSQL_USER=taktakmenu_user
MYSQL_PASSWORD=taktakmenu_pass
MYSQL_PORT=3306

# Application
PORT=5001
NODE_ENV=production

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# SMTP (Email)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password

# Frontend
FRONTEND_URL=http://localhost:3000

# phpMyAdmin (Optional)
PHPMYADMIN_PORT=8080
```

2. **Build and run**:
```bash
docker-compose -f docker-compose.local.yml up -d --build
```

3. **Access services**:
   - **API**: http://localhost:5001
   - **Swagger Docs**: http://localhost:5001/taktakmenu-api-docs
   - **phpMyAdmin**: http://localhost:8080

4. **View logs**:
```bash
docker-compose -f docker-compose.local.yml logs -f
```

5. **Stop**:
```bash
docker-compose -f docker-compose.local.yml down
```

6. **Remove volumes** (to delete database data):
```bash
docker-compose -f docker-compose.local.yml down -v
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | Database host (use `mysql` for local) | `mysql` or `db.example.com` |
| `DB_PORT` | Database port | `3306` |
| `DB_USER` | Database user | `taktakmenu_user` |
| `DB_PASS` | Database password | `secure_password` |
| `DB_NAME` | Database name | `taktakmenu_db` |
| `JWT_SECRET` | JWT secret key | `your-secret-key` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port (host) | `5001` |
| `NODE_ENV` | Environment | `production` |
| `JWT_EXPIRES_IN` | JWT expiration | `15m` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit max requests | `100` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` |

## Database Connection

### Remote Database
- Ensure your remote database is accessible from the Docker host
- For SSL connections, the app is configured to accept SSL certificates
- Update `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` in `.env`

### Local Database
- Database is automatically created on first run
- Data persists in Docker volume `mysql_data`
- Access via phpMyAdmin at http://localhost:8080
- Or connect directly: `mysql -h localhost -P 3306 -u taktakmenu_user -p`

## Useful Commands

### View running containers
```bash
docker-compose ps
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f mysql
```

### Execute commands in container
```bash
# Access app container shell
docker-compose exec app sh

# Access MySQL container
docker-compose exec mysql mysql -u root -p
```

### Rebuild after code changes
```bash
docker-compose up -d --build
```

### Stop and remove everything
```bash
docker-compose down -v
```

## Troubleshooting

### Application won't start
1. Check logs: `docker-compose logs app`
2. Verify database connection settings
3. Ensure database is accessible and credentials are correct

### Database connection errors
1. For remote DB: Check firewall rules and network connectivity
2. For local DB: Wait for MySQL to be healthy (check with `docker-compose ps`)
3. Verify credentials in `.env` file

### Port conflicts
- Change `PORT` in `.env` if port 5001 is already in use
- Change `MYSQL_PORT` if port 3306 is already in use

### Health checks failing
- Application health check runs on `/` endpoint
- Ensure the app is responding before health check timeout

## Production Considerations

1. **Never commit `.env` files** - Use secrets management
2. **Use strong passwords** - Especially for database and JWT
3. **Enable SSL/TLS** - For database connections in production
4. **Set `NODE_ENV=production`** - For optimized performance
5. **Use Docker secrets** - For sensitive data in production
6. **Regular backups** - For database volumes
7. **Monitor resources** - Set resource limits in production

## Security Notes

- The Dockerfile runs as non-root user for security
- Health checks are configured for container monitoring
- Network isolation is used between services
- SSL is enabled for remote database connections

