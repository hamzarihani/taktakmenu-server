import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { JwtMiddleware } from './common/middleware/jwt.middleware';
import { JwtModule } from '@nestjs/jwt';
import { TenantsModule } from './tenant/tenants.module';
import { PlansModule } from './plan/plans.module';
import { SubdomainMiddleware } from './common/middleware/subdomain.middleware';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Core modules
    DatabaseModule,
    UsersModule,
    TenantsModule,
    PlansModule,
    SubscriptionsModule,
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SubdomainMiddleware, JwtMiddleware)
      .exclude(
        { path: '', method: RequestMethod.GET },
        { path: 'auth/login', method: RequestMethod.ALL },
        { path: 'auth/signup', method: RequestMethod.ALL },
        { path: 'auth/refresh', method: RequestMethod.ALL },
        { path: 'auth/activate', method: RequestMethod.ALL },
        { path: 'auth/forgot-password', method: RequestMethod.ALL },
        { path: 'auth/reset-password', method: RequestMethod.ALL },
        { path: 'auth/resend-otp', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
