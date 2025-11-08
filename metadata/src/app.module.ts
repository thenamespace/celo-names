import { Module } from '@nestjs/common';
import { MetadataModule } from './metadata/metadata.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [ConfigModule, MetadataModule],
})
export class AppModule {}

