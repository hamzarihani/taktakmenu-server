import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

// App core
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Database
import { DatabaseModule } from './database/database.module';

// Feature modules
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenant/tenants.module';
import { PlansModule } from './plan/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { FileModule } from './file/file.module';
import { MenuCategoryModule } from './menu-category/menu-category.module';
import { MenuItemModule } from './menu-item/menu-item.module';
import { ContactModule } from './contact/contact.module';

// Middleware
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { SubdomainMiddleware } from './common/middleware/subdomain.middleware';
import { JwtMiddleware } from './common/middleware/jwt.middleware';
import { SecurityMiddleware } from './common/middleware/security.middleware';

/**
 * AppModule - Root module of the application
 * 
 * This module configures:
 * - Global configuration (ConfigModule)
 * - Database connection (DatabaseModule)
 * - JWT authentication (JwtModule)
 * - All feature modules
 * - Middleware pipeline (Rate Limiting, Subdomain, JWT)
 */
@Module({
  imports: [
    // Global configuration - must be first
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    }),

    // Database
    DatabaseModule,

    // Authentication & Authorization
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '15m' },
    }),

    // Core business modules
    UsersModule,
    TenantsModule,
    PlansModule,
    SubscriptionsModule,

    // Menu modules
    MenuCategoryModule,
    MenuItemModule,

    // File management
    FileModule,

    // Contact
    ContactModule,
  ],
  controllers: [AppController],
  providers: [AppService, RateLimitMiddleware, SubdomainMiddleware, SecurityMiddleware],
})
export class AppModule implements NestModule {
  /**
   * Configure middleware pipeline
   * 
   * Middleware order matters:
   * 1. RateLimitMiddleware - DDoS protection (applied first)
   * 2. SecurityMiddleware - SQL injection, XSS, and other attack prevention
   * 3. SubdomainMiddleware - Tenant identification
   * 4. JwtMiddleware - Authentication (excludes public routes)
   */
  configure(consumer: MiddlewareConsumer) {
    // Define public routes that don't require authentication
    const publicRoutes = this.getPublicRoutes();

    // 1. Rate Limiting - Apply to ALL routes (first line of defense)
    consumer.apply(RateLimitMiddleware).forRoutes('*');

    // 2. Security - Apply to ALL routes (SQL injection, XSS, etc.)
    consumer.apply(SecurityMiddleware).forRoutes('*');

    // 3. Subdomain Extraction - Apply to ALL routes
    consumer.apply(SubdomainMiddleware).forRoutes('*');

    // 4. JWT Authentication - Apply to all routes EXCEPT public routes
    consumer
      .apply(JwtMiddleware)
      .exclude(...publicRoutes)
      .forRoutes('*');
  }

  /**
   * Get list of public routes that don't require authentication
   * 
   * @returns Array of route exclusions for JWT middleware
   */
  private getPublicRoutes() {
    return [
      // Root endpoint
      { path: '', method: RequestMethod.GET },

      // Authentication endpoints
      { path: 'auth/login', method: RequestMethod.ALL },
      { path: 'auth/login-sys-admin', method: RequestMethod.ALL },
      { path: 'auth/signup', method: RequestMethod.ALL },
      { path: 'auth/refresh', method: RequestMethod.ALL },
      { path: 'auth/activate', method: RequestMethod.ALL },
      { path: 'auth/forgot-password', method: RequestMethod.ALL },
      { path: 'auth/reset-password', method: RequestMethod.ALL },
      { path: 'auth/resend-otp', method: RequestMethod.ALL },

      // Public API endpoints
      { path: 'menu-categories/public', method: RequestMethod.GET },
      { path: 'menu-items/public/category/:categoryId', method: RequestMethod.GET },
      { path: 'tenants/public/profile', method: RequestMethod.GET },
      { path: 'plans/public', method: RequestMethod.GET },
      { path: 'files/public/:id/serve', method: RequestMethod.GET },
      { path: 'contact', method: RequestMethod.POST },
    ];
  }
}
