import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    // Skip seeding in production/serverless environments to avoid blocking initialization
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.log('Skipping seed in production/serverless environment');
      return;
    }

    try {
      const usersCount = await this.userRepository.count();

      if (usersCount === 0) {
        console.log('🌱 Seeding initial data...');
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash("sysadmin555", saltRounds);
        const admin = this.userRepository.create({
          email: "sysadmin@taktakmenu.com",
          fullName: "System Admin",
          password: hashedPassword,
          isActive: true,
          otpCode: null,
          tenant: null,
          role: UserRole.SYS_ADMIN
        });
        await this.userRepository.save(admin);
        console.log('✅ Seed complete');
      } else {
        console.log('Database already seeded.');
      }
    } catch (error) {
      // Don't crash the app if seeding fails
      console.error('Seed service error (non-fatal):', error instanceof Error ? error.message : String(error));
    }
  }
}
