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
        ssl: true, // ✅ Hostinger requires SSL for remote MySQL
        extra: {
          ssl: {
            rejectUnauthorized: false,
          },
        },
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
