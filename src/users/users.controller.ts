import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Users Controller')
@ApiBearerAuth('access-token')
@Controller('')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('user/:id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post('user')
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Get('users')
  async getUsers(
    @Query('limit') limit: string,
    @Query('offset') offset: string,
  ) {
    if (limit === undefined || offset === undefined) {
      throw new BadRequestException('Both "limit" and "offset" query parameters are required.');
    }

    const parsedLimit = parseInt(limit, 10);
    const parsedOffset = parseInt(offset, 10);

    if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
      throw new BadRequestException('"limit" and "offset" must be valid numbers.');
    }

    if (parsedLimit <= 0 || parsedOffset < 0) {
      throw new BadRequestException('"limit" must be > 0 and "offset" must be >= 0.');
    }
    
    if (parsedLimit > 1000) {
      throw new BadRequestException('"limit" cannot exceed 1000.');
    }
    
    return this.usersService.findUsers(parsedLimit, parsedOffset);
  }
}
