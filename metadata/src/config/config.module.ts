import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        if (!config.BASE_URL) {
          throw new Error('BASE_URL environment variable is required');
        }
        return config;
      },
    }),
  ],
})
export class ConfigModule {}

