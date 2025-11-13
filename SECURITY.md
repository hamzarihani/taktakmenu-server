# Security Measures

This document outlines all security measures implemented in the Tak Tak Menu API to protect against common web application vulnerabilities.

## Table of Contents

1. [SQL Injection Protection](#sql-injection-protection)
2. [XSS Protection](#xss-protection)
3. [DDoS Protection](#ddos-protection)
4. [Security Headers](#security-headers)
5. [Input Validation](#input-validation)
6. [Authentication & Authorization](#authentication--authorization)
7. [CORS Configuration](#cors-configuration)
8. [Request Size Limits](#request-size-limits)
9. [Data Sanitization](#data-sanitization)

---

## SQL Injection Protection

### TypeORM Query Builder
- **All database queries use TypeORM's Query Builder** which automatically uses parameterized queries
- Example: `queryBuilder.where('user.id = :id', { id: userId })`

### Raw SQL Queries
- **DatabaseService.query()** enforces parameterized queries
- ⚠️ **NEVER** concatenate user input directly into SQL strings
- ✅ **SAFE**: `query('SELECT * FROM users WHERE id = ?', [userId])`
- ❌ **UNSAFE**: `query(\`SELECT * FROM users WHERE id = ${userId}\`)`

### Security Middleware
- **SecurityMiddleware** scans all incoming requests for SQL injection patterns
- Detects common SQL keywords and patterns in query params, body, and route params
- Blocks requests containing suspicious SQL patterns

---

## XSS Protection

### Security Middleware
- Scans for XSS patterns in all request data
- Detects:
  - `<script>` tags
  - `<iframe>` tags
  - `javascript:` protocol
  - Event handlers (`onclick`, `onerror`, etc.)
  - SVG with embedded scripts

### Sanitize Interceptor
- **SanitizeInterceptor** automatically sanitizes all response data
- Removes HTML tags and escapes special characters
- Prevents XSS attacks through API responses

### Helmet XSS Filter
- Helmet middleware enables browser XSS filter
- Adds `X-XSS-Protection` header

---

## DDoS Protection

### Rate Limiting Middleware
- **RateLimitMiddleware** implements IP-based rate limiting
- Configurable via environment variables:
  - `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)
  - `RATE_LIMIT_WINDOW_MS` - Time window in milliseconds (default: 60000 = 1 minute)
  - `RATE_LIMIT_BLOCK_DURATION_MS` - Block duration after limit exceeded (default: 300000 = 5 minutes)
  - `RATE_LIMIT_MAX_PER_MINUTE` - Stricter per-minute limit (default: 60)

### Request Size Limits
- JSON payloads limited to **10MB**
- URL-encoded payloads limited to **10MB**
- Prevents DoS attacks through large payloads

---

## Security Headers

### Helmet Middleware
Helmet sets the following security headers:

- **Content-Security-Policy (CSP)**: Restricts resource loading
- **X-Content-Type-Options: nosniff**: Prevents MIME type sniffing
- **X-Frame-Options: DENY**: Prevents clickjacking
- **X-XSS-Protection**: Enables browser XSS filter
- **Strict-Transport-Security (HSTS)**: Forces HTTPS connections
- **Referrer-Policy: no-referrer**: Controls referrer information

---

## Input Validation

### ValidationPipe
- **Whitelist**: Strips properties that don't have decorators
- **forbidNonWhitelisted**: Throws error if non-whitelisted properties are present
- **Transform**: Automatically transforms payloads to DTO instances
- **Error Messages**: Hidden in production to prevent information leakage

### Security Middleware
- Validates all incoming data (query, body, params, headers)
- Checks for:
  - SQL injection patterns
  - XSS patterns
  - Command injection patterns
  - Path traversal patterns
- Prevents deep nesting attacks (max depth: 10)
- Limits string length (max: 10,000 characters)

---

## Authentication & Authorization

### JWT Authentication
- All routes require JWT authentication except public routes
- JWT tokens expire after 15 minutes (configurable)
- Tokens are validated on every request

### Public Routes
The following routes are excluded from authentication:
- Root endpoint (`GET /`)
- Authentication endpoints (`/auth/*`)
- Public API endpoints:
  - `GET /menu-categories/public`
  - `GET /menu-items/public/category/:categoryId`
  - `GET /tenants/public/profile`
  - `GET /plans/public`

### Role-Based Access Control
- User roles are enforced at the service level
- `SUPER_ADMIN` role required for sensitive operations

---

## CORS Configuration

### Allowed Origins
- `http://localhost:3000` (development)
- `https://taktakmenu.com` (production)
- `FRONTEND_URL` environment variable

### Allowed Methods
- GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS

### Allowed Headers
- Content-Type
- Authorization
- X-Requested-With
- x-tenant-subdomain

### Credentials
- Credentials are allowed for authenticated requests

---

## Request Size Limits

### JSON Payloads
- Maximum size: **10MB**

### URL-Encoded Payloads
- Maximum size: **10MB**

### Purpose
- Prevents DoS attacks through large payloads
- Protects server resources

---

## Data Sanitization

### Sanitize Interceptor
- Automatically sanitizes all API responses
- Removes HTML tags
- Escapes special characters
- Preserves binary data (e.g., image data)

### Input Sanitization
- All user input is validated and sanitized
- SQL injection patterns are blocked
- XSS patterns are blocked
- Command injection patterns are blocked

---

## Best Practices

### For Developers

1. **Always use TypeORM Query Builder** for database queries
2. **Never concatenate user input** into SQL strings
3. **Use DTOs with validation decorators** for all endpoints
4. **Sanitize user input** before storing in database
5. **Use parameterized queries** for any raw SQL
6. **Validate file uploads** (type, size, content)
7. **Use HTTPS** in production
8. **Keep dependencies updated** to patch security vulnerabilities
9. **Review security logs** regularly
10. **Follow principle of least privilege** for user roles

### Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=15m

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_BLOCK_DURATION_MS=300000
RATE_LIMIT_MAX_PER_MINUTE=60

# CORS
FRONTEND_URL=https://your-frontend-url.com
```

---

## Security Checklist

- [x] SQL Injection protection (TypeORM + Security Middleware)
- [x] XSS protection (Security Middleware + Sanitize Interceptor)
- [x] DDoS protection (Rate Limiting)
- [x] Security headers (Helmet)
- [x] Input validation (ValidationPipe)
- [x] Authentication (JWT)
- [x] Authorization (Role-based)
- [x] CORS configuration
- [x] Request size limits
- [x] Data sanitization
- [x] HTTPS enforcement (HSTS)
- [x] Error message hiding in production

---

## Reporting Security Issues

If you discover a security vulnerability, please report it to the development team immediately. Do not create a public issue.

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)
- [TypeORM Security](https://typeorm.io/#/security)

