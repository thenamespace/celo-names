import { type Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

// FIXES THE ISSUE WITH QR CODE
export const patchSelfxyzQrcode = (): Plugin => ({
  name: 'patch-selfxyz-qrcode',
  
  // For development mode
  configResolved(config) {
    if (config.command === 'serve') {
      const patchFile = () => {
        const depsPath = path.resolve(
          config.root,
          'node_modules/.vite/deps/@selfxyz_qrcode.js'
        );

        if (fs.existsSync(depsPath)) {
          let content = fs.readFileSync(depsPath, 'utf-8');

          if (content.includes('Lottie.default')) {
            console.log('🔧 Patching @selfxyz/qrcode bundle (dev)...');
            content = content.replace(/Lottie\.default/g, 'Lottie');
            fs.writeFileSync(depsPath, content);
            console.log('✅ Dev patch applied successfully!');
          }
        }
      };

      setTimeout(patchFile, 1000);
    }
  },

  buildStart() {
    const depsPath = path.resolve('node_modules/.vite/deps/@selfxyz_qrcode.js');

    if (fs.existsSync(depsPath)) {
      let content = fs.readFileSync(depsPath, 'utf-8');

      if (content.includes('Lottie.default')) {
        console.log('🔧 Patching existing @selfxyz/qrcode bundle...');
        content = content.replace(/Lottie\.default/g, 'Lottie');
        fs.writeFileSync(depsPath, content);
        console.log('✅ Patch applied!');
      }
    }
  },

  // For production builds - transform the code before bundling
  transform(code, id) {
    // Check if this is the @selfxyz/qrcode package
    if (id.includes('@selfxyz/qrcode') || id.includes('@selfxyz\\qrcode')) {
      if (code.includes('Lottie.default')) {
        console.log('🔧 Patching @selfxyz/qrcode for production build...');
        return {
          code: code.replace(/Lottie\.default/g, 'Lottie'),
          map: null,
        };
      }
    }
    return null;
  },
});