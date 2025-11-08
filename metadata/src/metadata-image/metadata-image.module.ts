import { Module } from '@nestjs/common';
import { MetadataImageController } from './metadata-image.controller';
import { MetadataImageService } from './metadata-image.service';

@Module({
  controllers: [MetadataImageController],
  providers: [MetadataImageService],
})
export class MetadataImageModule {}

