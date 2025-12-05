import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MailerModule } from '@nestjs-modules/mailer';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'defaultSecret',
        signOptions: { expiresIn: '7d' }, // 7-day token
      }),
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const port = parseInt(config.get<string>('SMTP_PORT') || '587', 10);
        const isSecurePort = port === 465; // Port 465 requires SSL/TLS
        const smtpUser = config.get<string>('SMTP_USER') || 'no-reply@taktakmenu.com';
        
        return {
          transport: {
            host: config.get<string>('SMTP_HOST'),
            port: port,
            secure: isSecurePort, // true for 465 (SSL/TLS), false for 587 (STARTTLS)
            auth: {
              user: smtpUser,
              pass: config.get<string>('SMTP_PASS'),
            },
            connectionTimeout: 30000, // 30 seconds (increased for slower connections)
            greetingTimeout: 30000, // 30 seconds
            socketTimeout: 30000, // 30 seconds
            requireTLS: !isSecurePort, // Require TLS for port 587 (STARTTLS)
            tls: {
              rejectUnauthorized: false, // Set to true in production with valid certificates
            },
            // Additional options for better compatibility
            pool: false, // Disable connection pooling for better reliability
            maxConnections: 1,
            maxMessages: 1,
          },
          defaults: {
            // Use SMTP_USER as the sender address (required by most SMTP servers)
            from: `"TaktakMenu Platform" <${smtpUser}>`,
          },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: { strict: true },
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
