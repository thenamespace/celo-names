import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {patchSelfxyzQrcode} from "./qrcode-fix.plugin";


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), patchSelfxyzQrcode()],
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@hooks': '/src/hooks',
      '@utils': '/src/utils',
      '@assets': '/src/assets',
    },
  },
})
