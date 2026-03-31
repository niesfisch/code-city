import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'build/dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
})

