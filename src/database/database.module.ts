import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { SeedService } from './seed.service';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASS'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true, // automatically load entity files
        synchronize: true, // ❌ don't use true in production
        ssl: configService.get<string>('DB_SSL') === 'true' || false, // Enable SSL if DB_SSL=true
        extra: {
          ssl: configService.get<string>('DB_SSL') === 'true' ? {
            rejectUnauthorized: false,
          } : undefined,
          // Connection pool settings to prevent ECONNRESET errors
          connectionLimit: 10,
          // Keep connection alive
          keepAliveInitialDelay: 0,
          enableKeepAlive: true,
        },
        // Connection retry settings
        retryAttempts: 3,
        retryDelay: 3000, // 3 seconds
        // Logging for debugging
        logging: configService.get<string>('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [DatabaseService, SeedService],
  exports: [DatabaseService],
})
export class DatabaseModule {
  constructor(private readonly seedService: SeedService) {}
}
