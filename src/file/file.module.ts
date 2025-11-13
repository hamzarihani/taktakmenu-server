import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { Image } from './entities/image.entity';
import { FileUploadService } from './services/file-upload.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Image]),
    forwardRef(() => UsersModule),
  ],
  controllers: [FileController],
  providers: [FileService, FileUploadService],
  exports: [FileService, FileUploadService],
})
export class FileModule {}

