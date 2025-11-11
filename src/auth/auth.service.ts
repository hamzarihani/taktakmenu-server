import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dtos/signup.dto';
import { UserRole } from 'src/users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dtos/login.dto';
import { randomInt } from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async signup(dto: SignupDto) {
    try {
      // check if user already exists
      const existing = await this.usersService.findByEmail(dto.email);
      if (existing) {
        throw new BadRequestException('Email already registered');
      }

      // Generate OTP (6-digit)
      const otp = randomInt(100000, 999999).toString();

      // create user
      const user = await this.usersService.createUser({
        ...dto,
        role: UserRole.USER,
        otpCode: otp,
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      // send email with OTP
      await this.sendOtpEmail(user.email, otp);

      return {
        message:
          'Signup successful. Please check your email for activation code.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error; // already handled
      }
      throw new InternalServerErrorException(
        'Could not create user. Please try again later.',
      );
    }
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated. Contact support.');
    }
    
    return this.generateTokens(user);
  }

  private generateTokens(user: any) {
    const payload = { sub: user.id, role: user.role, tenantId: user?.tenant?.id };

    const access_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });
    const refresh_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
    return {
      access_token,
      refresh_token,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new UnauthorizedException('User not found');

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }
  }

  private async sendOtpEmail(email: string, otp: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Your Account Activation Code',
        text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
        html: `<p>Your OTP code is <b>${otp}</b>. It expires in 10 minutes.</p>`,
      });
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      throw new InternalServerErrorException(
        'Could not send activation email. Please try again later.',
      );
    }
  }

  private async sendResetPasswordUrl(email: string, url: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Your Account Activation Code',
        text: `Your Reset password Link is ${url}. It expires in 15 minutes.`,
        html: `<p>Your Reset password Link is <b>${url}</b>. It expires in 15 minutes.</p>`,
      });
    } catch (error) {
      console.error('Failed to send Reset password Link email:', error);
      throw new InternalServerErrorException(
        'Could not send Reset password Link email. Please try again later.',
      );
    }
  }

  async activateAccount(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    if (user.isActive)
      throw new BadRequestException('Account already activated');

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired OTP code');
    }
    // Check if OTP matches
    if (user.otpCode !== otp) {
      throw new BadRequestException('Incorrect OTP code');
    }

    try {
      await this.usersService.activateUser(user.id);
      return { message: 'Account activated successfully' };
    } catch (err) {
      throw new InternalServerErrorException('Could not activate account');
    }
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');

    const token = this.jwtService.sign(
      { sub: user.id },
      { secret: process.env.JWT_RESET_SECRET, expiresIn: '15m' },
    );

    await this.sendResetPasswordUrl(user.email, token);

    return { message: "Check your email for reset password link." };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_RESET_SECRET,
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new BadRequestException('User not found');

      const hashed = await bcrypt.hash(newPassword, 10);
      await this.usersService.updatePassword(user.id, hashed);

      return { message: 'Password updated successfully' };
    } catch (err) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  async resendOtp(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');

    if (user.isActive) {
      throw new BadRequestException('User already active');
    }

    const otp = randomInt(100000, 999999).toString();

    await this.usersService.saveOtp(user.id, otp);

    await this.sendOtpEmail(user.email, otp);

    return { message: 'OTP resent successfully' };
  }
}
