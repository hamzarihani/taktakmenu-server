import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { FileService } from './file.service';
import { Image } from './entities/image.entity';
import { GetUser } from 'src/common/get-user-decorator';
import type { JwtUser } from 'src/common/interfaces';
import { UsersService } from 'src/users/users.service';

@ApiTags('File Controller')
@ApiBearerAuth('access-token')
@Controller('files')
export class FileController {
  constructor(
    private fileService: FileService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) {}

  // Helper method to get tenantId from user
  private async getTenantId(user: JwtUser): Promise<string> {
    // First try to get from JWT payload
    if (user.tenantId) {
      return user.tenantId;
    }
    // Fallback: load from user entity
    const userEntity = await this.usersService.findById(user.sub);
    if (!userEntity.tenant?.id) {
      throw new BadRequestException('User must be associated with a tenant');
    }
    return userEntity.tenant.id;
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload an image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({ status: 201, description: 'Image uploaded successfully', type: Image })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string,
    @GetUser() user: JwtUser,
  ): Promise<Image> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const tenantId = await this.getTenantId(user);
    return this.fileService.uploadImage(file, tenantId, user.sub, folder || 'images');
  }

  @Get()
  @ApiOperation({ summary: 'Get all images for the current tenant' })
  @ApiResponse({ status: 200, description: 'Images fetched successfully', type: [Image] })
  async getImages(@GetUser() user: JwtUser): Promise<Image[]> {
    const tenantId = await this.getTenantId(user);
    return this.fileService.findByTenant(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an image by ID' })
  @ApiResponse({ status: 200, description: 'Image fetched successfully', type: Image })
  async getImage(
    @Param('id') id: string,
    @GetUser() user: JwtUser,
  ): Promise<Image> {
    const tenantId = await this.getTenantId(user);
    return this.fileService.findById(id, tenantId);
  }

  @Get(':id/serve')
  @ApiOperation({ summary: 'Serve image file from database' })
  @ApiResponse({ status: 200, description: 'Image file served successfully' })
  async serveImage(
    @Param('id') id: string,
    @GetUser() user: JwtUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const tenantId = await this.getTenantId(user);
    const image = await this.fileService.findById(id, tenantId, true);
    
    // Get image data from database (already a Buffer)
    const imageData = this.fileService.getImageData(image);
    
    if (!imageData) {
      throw new BadRequestException('Image data not found');
    }
    
    res.set({
      'Content-Type': image.mimeType || 'image/jpeg',
      'Content-Disposition': `inline; filename="${image.originalName || 'image'}"`,
      'Content-Length': image.size?.toString() || imageData.length.toString(),
    });
    
    // imageData is already a Buffer from the database
    return new StreamableFile(imageData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an image' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully' })
  async deleteImage(
    @Param('id') id: string,
    @GetUser() user: JwtUser,
  ): Promise<{ message: string }> {
    const tenantId = await this.getTenantId(user);
    await this.fileService.deleteImage(id, tenantId);
    return { message: 'Image deleted successfully' };
  }
}

