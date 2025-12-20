import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { SeedService } from './seed.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const port = configService.get<string>('DB_PORT');
        return {
          type: 'mysql',
          host: configService.get<string>('DB_HOST'),
          port: port ? parseInt(port, 10) : 3306,
          username: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASS'),
          database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true, // automatically load entity files
        // NEVER use synchronize in production - it causes schema conflicts
        // Use migrations instead for production deployments
        synchronize: false, // Disabled for production safety
        ssl: configService.get<string>('DB_SSL') === 'true' || false, // Enable SSL if DB_SSL=true
        // Don't fail on connection errors - let it retry on first query
        // This is important for serverless where connection might be delayed
        extra: {
          ssl: configService.get<string>('DB_SSL') === 'true' ? {
            rejectUnauthorized: false,
          } : undefined,
          // Connection pool settings to prevent ECONNRESET errors
          connectionLimit: 10,
          // Keep connection alive
          keepAliveInitialDelay: 0,
          enableKeepAlive: true,
          // Query timeout to prevent hanging queries
          queryTimeout: 30000, // 30 seconds
          // Socket timeout to detect connection issues faster
          socketTimeout: 60000, // 60 seconds
          // Reconnect on connection loss
          reconnect: true,
          // Acquire timeout for getting connection from pool
          acquireTimeout: 30000, // 30 seconds
        },
        // Connection retry settings
        retryAttempts: 3,
        retryDelay: 3000, // 3 seconds
        // Connection timeout for serverless environments
        connectTimeout: 10000, // 10 seconds
        // Logging for debugging
        logging: configService.get<string>('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
        // Don't fail on connection errors during initialization in serverless
        // The connection will be established on first query
        };
      },
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [DatabaseService, SeedService],
  exports: [DatabaseService],
})
export class DatabaseModule {
  constructor(private readonly seedService: SeedService) {}
}
