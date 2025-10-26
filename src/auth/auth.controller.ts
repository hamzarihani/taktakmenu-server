import {
  Controller,
  Post,
  Body,
  Req,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { VerifyOtpDto } from './dtos/verify-otp.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ResendOtpDto } from './dtos/resend-otp.dto';
import { ApiBody, ApiHeader, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth Controller')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiBody({
    description: 'Create a new user account',
    type: SignupDto,
    examples: {
      example1: {
        summary: 'Basic signup example',
        value: {
          email: 'user@example.com',
          password: 'StrongP@ssw0rd',
          fullName: 'John Doe',
        },
      },
    },
  })
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }
  @ApiBody({
    description: 'Login with email and password',
    type: LoginDto,
    examples: {
      userLogin: {
        summary: 'Example user login',
        value: { email: 'hamza@gmail.com', password: 'hamzus20' },
      },
    },
  })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiHeader({
    name: 'x-refresh-token',
    description: 'Refresh token received during login',
    required: true,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @Post('refresh')
  refresh(@Req() req: Request) {
    const refreshToken = req.headers['x-refresh-token'] as string;
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    return this.authService.refreshToken(refreshToken);
  }

  @ApiBody({
    description: 'Activate user account using OTP',
    type: VerifyOtpDto,
    examples: {
      otpActivation: {
        summary: 'Example payload to activate account',
        value: {
          email: 'user@example.com',
          otp: '123456',
        },
      },
    },
  })
  @Post('activate')
  async activate(@Body() dto: VerifyOtpDto) {
    return this.authService.activateAccount(dto.email, dto.otp);
  }

   @ApiBody({
    description: 'Request a password reset email for the user',
    type: ForgotPasswordDto,
    examples: {
      forgotPassword: {
        summary: 'Example payload for forgot password',
        value: {
          email: 'user@example.com',
        },
      },
    },
  })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @ApiHeader({
    name: 'x-reset-password-token',
    description: 'Reset token received via email',
    required: true,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({
    description: 'Set a new password',
    type: ResetPasswordDto,
    examples: {
      resetPassword: {
        summary: 'Example payload for resetting password',
        value: {
          newPassword: 'MyNewStrongP@ss123',
        },
      },
    },
  })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const resetToken = req.headers['x-reset-password-token'] as string;
    if (!resetToken) {
      throw new UnauthorizedException('Missing reset token');
    }
    return this.authService.resetPassword(resetToken, dto.newPassword);
  }

  @ApiBody({
    description: 'Request to resend OTP to user email',
    type: ResendOtpDto,
    examples: {
      resendOtp: {
        summary: 'Example payload to resend OTP',
        value: {
          email: 'user@example.com',
        },
      },
    },
  })
  @Post('resend-otp')
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto.email);
  }
}
