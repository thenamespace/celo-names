import { Injectable, OnModuleInit } from '@nestjs/common';
import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D } from 'canvas';
import { join } from 'path';

@Injectable()
export class MetadataImageService implements OnModuleInit {
  private celoLogo: any = null;
  private ensLogo: any = null;
  private imageCache: Map<string, Buffer> = new Map();
  private readonly MAX_CACHE_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB limit

  async onModuleInit() {
    // Load font at startup
    try {
      const fontPath = join(process.cwd(), 'src', 'assets', 'InterSemiBold.ttf');
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
      const secondLevel = `${parts[1]}.${parts[2]}`; // test.eth
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
    // Check cache first
    if (this.imageCache.has(name)) {
      return this.imageCache.get(name)!;
    }

    // Generate new image
    const imageBuffer = await this.generateImageInternal(name);

    // Try to cache the result (with 1GB size limit to prevent memory issues)
    const hasEnoughSpace = this.hasEnoughCacheSpace(imageBuffer.length);
    if (hasEnoughSpace) {
      this.imageCache.set(name, imageBuffer);
    } else {
      console.error('Not enough cache memory');
    }

    return imageBuffer;
  }

  /**
   * Calculate total cache size in bytes
   */
  private getCacheSizeBytes(): number {
    let totalBytes = 0;
    for (const buffer of this.imageCache.values()) {
      totalBytes += buffer.length;
    }
    return totalBytes;
  }

  /**
   * Check if there's enough space in cache for a new image
   * @param newImageSize Size of the new image in bytes
   * @returns true if there's enough space, false otherwise
   */
  private hasEnoughCacheSpace(newImageSize: number): boolean {
    const currentSize = this.getCacheSizeBytes();
    return currentSize + newImageSize <= this.MAX_CACHE_SIZE_BYTES;
  }


  private attachLogo(
    type: 'ens' | 'celo',
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    const logoSize = 70;
    const padding = 40;
    const logo = type === 'celo' ? this.celoLogo : this.ensLogo;

    if (!logo) {
      return;
    }

    if (type === 'celo') {
      ctx.drawImage(logo, padding, padding, logoSize, logoSize);
    } else {
      // ENS logo is slightly larger
      ctx.drawImage(logo, width - logoSize - padding, padding, logoSize + 5, logoSize + 5);
    }
  }


  private setNameText(
    label: string,
    parent: string,
    ctx: CanvasRenderingContext2D,
    height: number,
  ): void {
    // Truncate label if longer than 12 characters
    let truncatedLabel = label;
    if (label.length > 12) {
      const start = label.substring(0, 4);
      const end = label.substring(label.length - 4);
      truncatedLabel = `${start}...${end}`;
    }

    // Set text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    const bottomPadding = 30;
    const leftPadding = 40;
    const lineSpacing = 1;
    const fontSize = 68;

    // Draw label (e.g., "test") - on top
    ctx.fillStyle = '#000000';
    ctx.font = `${fontSize}px InterRegular`;
    const labelY = height - bottomPadding - fontSize - lineSpacing;
    ctx.fillText(truncatedLabel, leftPadding, labelY);

    // Draw parent (e.g., "test.eth") - below label, with 0.6 opacity
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.font = `${fontSize}px InterRegular`;
    const parentY = height - bottomPadding;
    ctx.fillText(parent, leftPadding, parentY);
  }

  private async generateImageInternal(name: string): Promise<Buffer> {
    // Create canvas without alpha channel to ensure opaque background
    const width = 500;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d', { alpha: false });

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#FCFF52');
    gradient.addColorStop(1, '#FCFF52');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw logos
    this.attachLogo('celo', ctx, width, height);
    this.attachLogo('ens', ctx, width, height);

    // Parse domain name
    const { firstLevel, secondLevel } = this.parseDomainName(name);

    // Draw name text
    this.setNameText(firstLevel, secondLevel, ctx, height);

    // Convert canvas to buffer with explicit PNG options
    return canvas.toBuffer('image/png', { compressionLevel: 6 });
  }

  getCacheSize(): { current: number; max: number; sizeMB: number; maxMB: number } {
    const totalBytes = this.getCacheSizeBytes();
    
    // Convert to MB (1 MB = 1024 * 1024 bytes)
    const sizeMB = totalBytes / (1024 * 1024);
    const maxMB = this.MAX_CACHE_SIZE_BYTES / (1024 * 1024);
    
    return {
      current: this.imageCache.size,
      max: this.imageCache.size, // Number of entries (no longer a fixed limit)
      sizeMB: Math.round(sizeMB * 100) / 100, // Round to 2 decimal places
      maxMB: Math.round(maxMB * 100) / 100, // Max size in MB (1024 MB = 1GB)
    };
  }
}

