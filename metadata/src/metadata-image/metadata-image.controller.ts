import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetadataImageService } from './metadata-image.service';

@Controller('metadata')
export class MetadataImageController {
  constructor(private readonly metadataImageService: MetadataImageService) {}

  @Get('/:name')
  async getMetadataImage(
    @Param('name') name: string,
    @Res() res: Response,
  ): Promise<void> {
    const imageBuffer = await this.metadataImageService.generateImage(name);
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
    });
    
    res.send(imageBuffer);
  }

  @Get('/metadata/:name/image')
  async getMetadataImageV2(
    @Param('name') name: string,
    @Res() res: Response,
  ): Promise<void> {
    const imageBuffer = await this.metadataImageService.generateImage(name);
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
    });
    
    res.send(imageBuffer);
  }

  @Get('/cache/size')
  getCacheSize() {
    return this.metadataImageService.getCacheSize();
  }
}

