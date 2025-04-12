import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Node.js 환경에서는 getRandomValues를 대체
    'global.crypto': 'require("crypto")'
  },
  resolve: {
    alias: {
      crypto: 'crypto-browserify'
    }
  }
})
