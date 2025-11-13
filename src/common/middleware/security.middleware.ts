import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

/**
 * Security Middleware
 * 
 * Protects against:
 * - SQL Injection attacks
 * - XSS (Cross-Site Scripting) attacks
 * - NoSQL Injection attacks
 * - Command Injection attacks
 * - Path Traversal attacks
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  // Safe query parameter keys (whitelist approach)
  private readonly safeQueryKeys = [
    'page',
    'limit',
    'sortBy',
    'sortOrder',
    'search',
    'categoryId',
    'folder',
  ];

  // Safe field name patterns (camelCase, snake_case, etc.)
  private readonly safeFieldNamePattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;

  // SQL Injection patterns (more specific, context-aware)
  private readonly sqlInjectionPatterns = [
    // SQL keywords in suspicious contexts
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\s+.*\b(FROM|INTO|SET|WHERE|VALUES)\b/gi,
    // SQL injection attempts with OR/AND
    /\b(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/gi,
    // SQL comments
    /(--|\#|\/\*|\*\/)/g,
    // Suspicious SQL patterns
    /\b(UNION|SELECT)\s+.*\s+FROM/gi,
    /\b(INSERT|UPDATE|DELETE)\s+.*\s+(INTO|SET|FROM)/gi,
    // Multiple semicolons (potential command chaining)
    /;.*;/g,
    // SQL wildcards in suspicious contexts (not in field names)
    /['"]%.*['"]|['"].*%.*['"]/g,
  ];

  // XSS patterns
  private readonly xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /<img[^>]+src[^>]*=.*javascript:/gi,
    /<svg[^>]*>.*<script/gi,
  ];

  // Command Injection patterns
  private readonly commandInjectionPatterns = [
    /[;&|`$(){}[\]]/g,
    /\b(cat|ls|pwd|whoami|id|uname|ps|kill|rm|mv|cp|chmod|chown)\b/gi,
    /(\||\||&&|;|`|\$\(|\${)/g,
  ];

  // Path Traversal patterns
  private readonly pathTraversalPatterns = [
    /\.\.(\/|\\)/g,
    /\.\.%2F/gi,
    /\.\.%5C/gi,
    /\.\.%252F/gi,
    /\.\.%255C/gi,
  ];

  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Check query parameters
      if (req.query) {
        this.validateObject(req.query, 'query parameter');
      }

      // Check body parameters
      if (req.body && typeof req.body === 'object') {
        this.validateObject(req.body, 'body parameter');
      }

      // Check route parameters
      if (req.params) {
        this.validateObject(req.params, 'route parameter');
      }

      // Check headers for suspicious content
      this.validateHeaders(req.headers);

      next();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid request data detected');
    }
  }

  /**
   * Recursively validate object properties
   */
  private validateObject(obj: any, context: string, depth = 0): void {
    // Prevent deep nesting attacks
    if (depth > 10) {
      throw new BadRequestException('Request data structure too deep');
    }

    const isQueryContext = context.includes('query parameter');

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        // For query parameters, check if key is safe
        const isSafeKey = isQueryContext && this.safeQueryKeys.includes(key);
        const isSafeFieldName = this.safeFieldNamePattern.test(key);

        // Validate key (more lenient for safe query keys)
        if (!isSafeKey) {
          this.validateString(key, `${context} key`, isSafeFieldName);
        }

        // Validate value
        if (typeof value === 'string') {
          // For sortBy and other safe keys, only check basic patterns
          if (isSafeKey && (key === 'sortBy' || key === 'sortOrder')) {
            this.validateSafeFieldValue(value, `${context} value`);
          } else {
            this.validateString(value, `${context} value`, isSafeFieldName);
          }
        } else if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (typeof item === 'string') {
                this.validateString(item, `${context}[${index}]`, false);
              } else if (typeof item === 'object' && item !== null) {
                this.validateObject(item, `${context}[${index}]`, depth + 1);
              }
            });
          } else {
            this.validateObject(value, `${context}.${key}`, depth + 1);
          }
        }
      }
    }
  }

  /**
   * Validate safe field values (like sortBy, sortOrder)
   * Only checks for basic security issues, allows common field names
   */
  private validateSafeFieldValue(str: string, context: string): void {
    if (typeof str !== 'string') {
      return;
    }

    // Check length
    if (str.length > 100) {
      throw new BadRequestException(`Suspiciously long ${context} detected`);
    }

    // Allow common field names (camelCase, snake_case, etc.)
    if (this.safeFieldNamePattern.test(str)) {
      // Only check for obvious SQL injection attempts in suspicious patterns
      const dangerousPatterns = [
        /[;'"]/g, // Semicolons, quotes
        /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\s+.*\b(FROM|INTO|SET|WHERE)\b/gi, // SQL keywords in suspicious contexts
        /(--|\#|\/\*|\*\/)/g, // SQL comments
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(str)) {
          throw new BadRequestException(
            `Potential SQL injection detected in ${context}`,
          );
        }
      }
      return; // Safe field name, no further checks needed
    }

    // For non-standard field names, do full validation
    this.validateString(str, context, false);
  }

  /**
   * Validate string for security threats
   */
  private validateString(str: string, context: string, isFieldName = false): void {
    if (typeof str !== 'string') {
      return;
    }

    // Check length (prevent DoS)
    if (str.length > 10000) {
      throw new BadRequestException(`Suspiciously long ${context} detected`);
    }

    // For field names, be more lenient - only check for obvious threats
    if (isFieldName) {
      // Only block if it contains SQL keywords in suspicious patterns
      const dangerousPatterns = [
        /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\s+.*\b(FROM|INTO|SET|WHERE)\b/gi,
        /[;'"]/g,
        /(--|\#|\/\*|\*\/)/g,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(str)) {
          throw new BadRequestException(
            `Potential SQL injection detected in ${context}`,
          );
        }
      }
      return; // Skip other checks for field names
    }

    // Check for SQL Injection (full check for non-field-name values)
    for (const pattern of this.sqlInjectionPatterns) {
      if (pattern.test(str)) {
        throw new BadRequestException(
          `Potential SQL injection detected in ${context}`,
        );
      }
    }

    // Check for XSS
    for (const pattern of this.xssPatterns) {
      if (pattern.test(str)) {
        throw new BadRequestException(
          `Potential XSS attack detected in ${context}`,
        );
      }
    }

    // Check for Command Injection (only for non-field-name values)
    for (const pattern of this.commandInjectionPatterns) {
      if (pattern.test(str)) {
        throw new BadRequestException(
          `Potential command injection detected in ${context}`,
        );
      }
    }

    // Check for Path Traversal
    for (const pattern of this.pathTraversalPatterns) {
      if (pattern.test(str)) {
        throw new BadRequestException(
          `Potential path traversal detected in ${context}`,
        );
      }
    }

    // Validate URL if it's a URL
    if (str.startsWith('http://') || str.startsWith('https://')) {
      if (!validator.isURL(str, { require_protocol: true })) {
        throw new BadRequestException(`Invalid URL in ${context}`);
      }
    }

    // Validate email if it looks like an email
    if (str.includes('@') && str.includes('.')) {
      if (!validator.isEmail(str)) {
        // Don't throw, just log - might be false positive
      }
    }
  }

  /**
   * Validate headers for suspicious content
   */
  private validateHeaders(headers: any): void {
    const suspiciousHeaders = ['user-agent', 'referer', 'origin'];

    for (const headerName of suspiciousHeaders) {
      const headerValue = headers[headerName];
      if (headerValue && typeof headerValue === 'string') {
        // Check for XSS in headers
        for (const pattern of this.xssPatterns) {
          if (pattern.test(headerValue)) {
            throw new BadRequestException(
              `Suspicious content in ${headerName} header`,
            );
          }
        }
      }
    }
  }
}

