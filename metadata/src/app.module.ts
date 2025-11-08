import { Module } from '@nestjs/common';
import { MetadataImageModule } from './metadata-image/metadata-image.module';

@Module({
  imports: [MetadataImageModule],
})
export class AppModule {}

