import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust proxy for accurate IP detection behind load balancers/proxies
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  // ============================================
  // Security Headers (Helmet)
  // ============================================
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Swagger UI
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Disable for Swagger compatibility
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true, // Prevent MIME type sniffing
      xssFilter: true, // Enable XSS filter
      referrerPolicy: { policy: 'no-referrer' },
      frameguard: { action: 'deny' }, // Prevent clickjacking
    }),
  );

  // ============================================
  // Request Size Limits (Prevent DoS)
  // ============================================
  app.use(json({ limit: '10mb' })); // Limit JSON payload size
  app.use(urlencoded({ extended: true, limit: '10mb' })); // Limit URL-encoded payload size

  // ============================================
  // CORS Configuration
  // ============================================
  app.enableCors({
    origin: (origin, callback) => {
      // Base domains that should allow all subdomains
      const allowedBaseDomains = [
        'taktakmenu.com',
        // Add more base domains here, e.g.:
        // 'example.com',
        // 'anotherdomain.com',
      ];

      // Specific origins (exact matches)
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5001',
        'https://taktakmenu.com',
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      // Helper function to check if origin matches base domain or any subdomain
      const isAllowedDomain = (originUrl: string): boolean => {
        try {
          const url = new URL(originUrl);
          const hostname = url.hostname;

          // Check exact matches first
          if (allowedOrigins.includes(originUrl)) {
            return true;
          }

          // Check if it matches any base domain or its subdomains
          for (const baseDomain of allowedBaseDomains) {
            // Exact match
            if (hostname === baseDomain) {
              return true;
            }
            // Subdomain match (e.g., subdomain.taktakmenu.com)
            if (hostname.endsWith(`.${baseDomain}`)) {
              return true;
            }
          }

          return false;
        } catch (error) {
          return false;
        }
      };

      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (isAllowedDomain(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-tenant-subdomain',
      'x-refresh-token',
    ],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // 24 hours
  });

  // ============================================
  // Swagger Configuration
  // ============================================
  const config = new DocumentBuilder()
    .setTitle('Tak Tak Menu')
    .setDescription('The Tak Tak Menu API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token here',
      },
      'access-token',
    )
    .build();

  // if (process.env.NODE_ENV !== 'production') {
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('taktakmenu-api-docs', app, document, {
    swaggerOptions: {
      docExpansion: 'none',
      persistAuthorization: true,
    },
  });
  // }

  // ============================================
  // Global Validation Pipe (Enhanced Security)
  // ============================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Allow implicit type conversion
      },
      disableErrorMessages: process.env.NODE_ENV === 'production', // Hide error details in production
      validationError: {
        target: false, // Don't expose the target object
        value: false, // Don't expose the value
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
