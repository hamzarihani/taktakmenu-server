import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { FetchUsersDto } from './dtos/fetch-users.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(dto.password, saltRounds);
      const user = this.usersRepository.create({
        ...dto,
        password: hashedPassword,
      });
      return await this.usersRepository.save(user);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('User with this email already exists.');
      }
      throw new BadRequestException('Failed to create user');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findUsers(limit: number, offset: number): Promise<FetchUsersDto[]> {
    try {
      const users = await this.usersRepository.find({
        skip: offset,
        take: limit,
        order: { createdAt: 'DESC' },
      });
      return plainToInstance(FetchUsersDto, users, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  async activateUser(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      isActive: true,
      otpCode: null,
      otpExpiresAt: null,
    });
  }

  async updatePassword(id: string, hashedPassword: string) {
    return this.usersRepository.update(id, { password: hashedPassword });
  }

  async saveOtp(id: string, otp: string) {
    return this.usersRepository.update(id, {
      otpCode: otp,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
  }
}
