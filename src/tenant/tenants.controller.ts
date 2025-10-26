import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';

@ApiTags('Users Controller')
@ApiBearerAuth('access-token')
@Controller('')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get('user/:id')
  async getTenant(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }
}
