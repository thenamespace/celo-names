import { Injectable, OnModuleInit } from '@nestjs/common';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { join } from 'path';

@Injectable()
export class MetadataImageService implements OnModuleInit {
  private celoLogo: any = null;
  private ensLogo: any = null;

  async onModuleInit() {
    // Load font at startup
    try {
      const fontPath = join(process.cwd(), 'src', 'assets', 'InterRegular.ttf');
      registerFont(fontPath, { family: 'InterRegular' });
    } catch (error) {
      console.error('Error loading font at startup:', error);
    }

    // Load logos at startup
    try {
      const celoLogoPath = join(process.cwd(), 'src', 'assets', 'celo.png');
      this.celoLogo = await loadImage(celoLogoPath);
      
      const ensLogoPath = join(process.cwd(), 'src', 'assets', 'ens.png');
      this.ensLogo = await loadImage(ensLogoPath);
    } catch (error) {
      console.error('Error loading logo images at startup:', error);
    }
  }

  /**
   * Parse domain name to extract parts
   * e.g., "test.celo.eth" -> ["test", "test.eth"]
   */
  private parseDomainName(name: string): { firstLevel: string; secondLevel: string } {
    const parts = name.split('.');
    if (parts.length >= 3) {
      // 3-level domain: test.celo.eth
      const firstLevel = parts[0]; // test
      const lastPart = parts[parts.length - 1]; // eth
      const secondLevel = `${firstLevel}.${lastPart}`; // test.eth
      return { firstLevel, secondLevel };
    } else if (parts.length === 2) {
      // 2-level domain: test.eth
      return { firstLevel: parts[0], secondLevel: name };
    } else {
      // Single level: test
      return { firstLevel: name, secondLevel: name };
    }
  }

  async generateImage(name: string): Promise<Buffer> {
    // Create canvas without alpha channel to ensure opaque background
    const width = 500;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d', { alpha: false });

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#E7E3D4');
    gradient.addColorStop(1, '#E7E3D4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw logos (loaded at startup)
    const logoSize = 70;
    const padding = 40;
    
    if (this.celoLogo) {
      ctx.drawImage(this.celoLogo, padding, padding, logoSize, logoSize);
    }

    if (this.ensLogo) {
      ctx.drawImage(this.ensLogo, width - logoSize - padding, padding, logoSize + 5, logoSize + 5);
    }

    // Parse domain name
    const { firstLevel, secondLevel } = this.parseDomainName(name);

    // Draw text at bottom
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const bottomPadding = 60;
    const lineSpacing = 10;

    // Draw second level (e.g., "test.eth") - smaller, at the very bottom
    ctx.fillStyle = '#000000'; // White
    ctx.font = '48px InterRegular';
    const secondLevelY = height - bottomPadding;
    ctx.fillText(secondLevel, width / 2, secondLevelY);

    // Draw first level (e.g., "test") - larger, above the second level
    ctx.fillStyle = '#000000'; // White
    ctx.font = '72px InterRegular';
    const firstLevelY = secondLevelY - lineSpacing - 48; // Position above second level
    ctx.fillText(firstLevel, width / 2, firstLevelY);

    // Convert canvas to buffer with explicit PNG options
    return canvas.toBuffer('image/png', { compressionLevel: 6 });
  }
}

