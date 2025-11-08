import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetadataService } from './metadata.service';
import { NameMetadata } from './metadata.types';

@Controller('/metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Get('/:name')
  async getMetadataImage(
    @Param('name') name: string,
  ): Promise<NameMetadata> {
    
    return this.metadataService.getMetadata(name)
  }

  @Get('/:name/image')
  async getMetadataImageV2(
    @Param('name') name: string,
    @Res() res: Response,
  ): Promise<void> {
    const imageBuffer = await this.metadataService.generateImage(name);
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
    });
    
    res.send(imageBuffer);
  }

  @Get('/cache/size')
  getCacheSize() {
    return this.metadataService.getCacheSize();
  }
}

